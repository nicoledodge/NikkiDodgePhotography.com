# Photography email setup

The existing mailcow VM in namespace `mailcow` hosts `nikkidodgephotography.com` alongside the existing domains. Webmail is available at `https://mail.miles.systems/SOGo/`.

## Mailboxes and credentials

- Primary mailbox: `nicole@nikkidodgephotography.com`, 5 GiB quota.
- Aliases to that inbox: `nikki`, `hello`, `bookings`, `postmaster`, `abuse`, and `dmarc` at the photography domain.
- `hello@nikkidodgephotography.com` is authorized as a sending identity for the Nicole mailbox. It uses the same inbox and login, with no separate password.
- The domain has a 10 GiB total quota, capacity for five mailboxes, and 25 aliases.
- An SMTP-only application password named `Photography website` is separate from the mailbox login.
- The SMTP settings are stored in Kubernetes Secret `default/nikkidodgephotography-smtp`. Never commit credential values. The local operator's webmail login file is `~/.config/nikkidodgephotography/mail-login.txt`, with mode `0600`.

The mailbox and aliases were created using mailcow's authenticated API. A database backup was saved privately on the mail VM before creation. Existing domain mailboxes, sender permissions, and public admin restrictions were preserved.

## DNS activation

Public Route 53 hosted zone: `Z07692281ZPA69XU7TVMH`.

`mail-dns-create.json` contains the four records required for activation: MX to `mail.miles.systems`, SPF authorizing that MX, mailcow's public DKIM key, and DMARC in monitoring mode. The batch uses `CREATE` to fail if a target record already exists. Re-read the zone first, and reconcile existing records rather than replacing them blindly. All unrelated website and certificate records must be preserved.

On September 16, 2026, Richard's SSO profile `richard-nikki-mail` in the Shared Networking account applied the four records. Route 53 change `C05682622ROG1HNFQWMW7` reached `INSYNC`; all four authoritative nameservers returned the new records, and all seven pre-existing records were unchanged. The cluster's narrower cert-manager credential remains unchanged.

DNS is active, but public mail activation is **not complete**: the edge router still needs the forwarding rules below. Do not report external delivery as verified.

For a fresh setup only, the reviewed creation command is below. The records already exist in this deployment; do not rerun the CREATE batch:

```sh
aws --profile YOUR_AUTHORIZED_PROFILE route53 change-resource-record-sets \
  --hosted-zone-id Z07692281ZPA69XU7TVMH \
  --change-batch file://deploy/booking/mail-dns-create.json
```

Verify Route 53 reports the change as `INSYNC`, then query the authoritative nameservers for MX, SPF, `dkim._domainkey`, and `_dmarc`. Compare the complete zone with the saved pre-change backup. Test inbound and outbound delivery to an account controlled by the owner before declaring delivery verified. `mail-dns-rollback.json` removes only the exact four prepared records; use it only if those records were actually created and rollback is needed.

## Public SMTP and Apple Mail activation

The encrypted client gateway is deployed and ready on the LAN. `mailcow-public-mail.yaml` adds the gateway configuration, TLS backend Service, and narrow NetworkPolicies. `mailcow-gateway-patch.json` updates the existing DaemonSet without replacing its image or other configuration; `mailcow-client-service-patch.json` adds TLS client ports to its existing Service. The patches have already been applied and intentionally fail if their expected starting state differs. All seven gateway pods were ready after rollout.

An authenticated test sent as `hello@` was delivered to the Nicole INBOX over verified TLS; the delivered message included a DKIM signature. Public ports 465 and 993 still time out, while the LAN endpoints work. The existing public port 25 route was restored to Assessorly until the edge router can preserve client IPs through mailcow. The website and SSH ingress Service settings remain unchanged.

Required router port forwards for public IP `204.57.21.205`:

| Public TCP port | Internal target | Purpose |
| --- | --- | --- |
| 25 | `192.168.1.248:10025` | Shared inbound SMTP through the existing gateway |
| 465 | `192.168.1.248:465` | Authenticated SMTP with implicit TLS |
| 993 | `192.168.1.248:993` | IMAP with implicit TLS |

Use destination NAT without source NAT for Internet-originated connections so the gateway can forward the real sender IP. `smtp-entry` already uses `externalTrafficPolicy: Local`; the VIP owner must have a ready `smtp-gateway` endpoint. Keep the HTTP/HTTPS and SSH router rules unchanged.

The gateway forwards inbound SMTP using PROXY protocol to mailcow. Mailcow already has an explicit `assessorly.me` relay transport to `10.53.235.158:25`, recipient verification, one recipient per relay delivery, and a concurrency limit of three. Its known-valid and unknown-recipient paths were verified without sending Assessorly messages. Preserve that transport when the REConnect Service IP changes. TLS client ports pass through encryption to mailcow; their backend logs see the gateway address, while gateway logs retain the connecting IP and apply connection limits.

Do not route public SMTP through the shared `ingress-expose` Service with its existing `externalTrafficPolicy: Cluster`: it masks client IPs and breaks SPF evaluation. A temporary test of that path was rolled back. The original `rke2-ingress-nginx-tcp-services` port-25 entry is `production/express-www-reconnect-mail-forwarder:25`.

After the router changes, verify the real external sender IP in mailcow logs, valid/invalid recipients for both domains, unauthorized relay rejection, SMTP/IMAP certificate validation and authentication, and an external end-to-end delivery test. Outbound delivery to other providers is not yet verified; the public IP currently has an ISP-generated PTR and may need a matching reverse-DNS hostname for reliable outbound delivery.

Apple Mail settings:

- Display/sending address: `hello@nikkidodgephotography.com`.
- Username for both servers: `nicole@nikkidodgephotography.com`.
- Incoming host: `mail.miles.systems`, IMAP port 993, SSL/TLS on.
- Outgoing host: `mail.miles.systems`, SMTP port 465, SSL/TLS on, password authentication.
- Use the mailbox password from the private local login file. Never disable certificate verification.

The Mac's Mail account form has these identity and host values entered. Account activation still requires reachable public client ports; the account has not yet been successfully added.

## Private website submission

`mailcow-submission.yaml` creates an internal Service on port 587 and a NetworkPolicy allowing only pods labeled `app=nikkidodgephotography` in namespace `default` to reach it. It does not expose SMTP or IMAP to the Internet. Webmail remains the existing public access path.

The application uses STARTTLS and validates the certificate for `mail.miles.systems` with `SMTP_TLS_SERVERNAME`, even though it connects to internal service DNS. An SMTP authentication check from the running photography pod passed without sending mail. Mailbox IMAP authentication and access to the new INBOX also passed over verified TLS. A connection test from the unrelated webmail gateway could reach its existing HTTP service but could not reach the new SMTP service, confirming the restricted network path.

After DNS and delivery verification, merge only the `SMTP_*` fields from `nikkidodgephotography-smtp` into the app's configured runtime Secret, or add the SMTP Secret as a subsequent `envFrom` source during an authorized release. Its empty `SMTP_URL` prevents an obsolete URL from overriding the individual settings. Preserve every other application Secret key. The SMTP Secret is currently staged separately; it does not enable the unfinished booking release or change the existing app's mail transport automatically.
