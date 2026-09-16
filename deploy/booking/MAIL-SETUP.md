# Photography email setup

The existing mailcow VM in namespace `mailcow` hosts `nikkidodgephotography.com` alongside the existing domains. Webmail is available at `https://mail.miles.systems/SOGo/`.

## Mailboxes and credentials

- Primary mailbox: `nicole@nikkidodgephotography.com`, 5 GiB quota.
- Aliases to that inbox: `nikki`, `hello`, `bookings`, `postmaster`, `abuse`, and `dmarc` at the photography domain.
- The domain has a 10 GiB total quota, capacity for five mailboxes, and 25 aliases.
- An SMTP-only application password named `Photography website` is separate from the mailbox login.
- The SMTP settings are stored in Kubernetes Secret `default/nikkidodgephotography-smtp`. Never commit credential values. The local operator's webmail login file is `~/.config/nikkidodgephotography/mail-login.txt`, with mode `0600`.

The mailbox and aliases were created using mailcow's authenticated API. A database backup was saved privately on the mail VM before creation. Existing domain mailboxes, sender permissions, and public admin restrictions were preserved.

## DNS activation

Public Route 53 hosted zone: `Z07692281ZPA69XU7TVMH`.

`mail-dns-create.json` contains the four records required for activation: MX to `mail.miles.systems`, SPF authorizing that MX, mailcow's public DKIM key, and DMARC in monitoring mode. The batch uses `CREATE` to fail if a target record already exists. Re-read the zone first, and reconcile existing records rather than replacing them blindly. All unrelated website and certificate records must be preserved.

At setup, the cluster's cert-manager credential could read this zone but AWS denied `route53:ChangeResourceRecordSets` for the mail records. The DNS batch therefore remains pending an authorized AWS identity. Do not report external mail delivery as ready based only on mailbox creation or SMTP authentication.

With an AWS profile authorized for this zone, apply the reviewed batch:

```sh
aws --profile YOUR_AUTHORIZED_PROFILE route53 change-resource-record-sets \
  --hosted-zone-id Z07692281ZPA69XU7TVMH \
  --change-batch file://deploy/booking/mail-dns-create.json
```

Verify Route 53 reports the change as `INSYNC`, then query the authoritative nameservers for MX, SPF, `dkim._domainkey`, and `_dmarc`. Compare the complete zone with the saved pre-change backup. Test inbound and outbound delivery to an account controlled by the owner before declaring delivery verified. `mail-dns-rollback.json` removes only the exact four prepared records; use it only if those records were actually created and rollback is needed.

## Private website submission

`mailcow-submission.yaml` creates an internal Service on port 587 and a NetworkPolicy allowing only pods labeled `app=nikkidodgephotography` in namespace `default` to reach it. It does not expose SMTP or IMAP to the Internet. Webmail remains the existing public access path.

The application uses STARTTLS and validates the certificate for `mail.miles.systems` with `SMTP_TLS_SERVERNAME`, even though it connects to internal service DNS. An SMTP authentication check from the running photography pod passed without sending mail. Mailbox IMAP authentication and access to the new INBOX also passed over verified TLS. A connection test from the unrelated webmail gateway could reach its existing HTTP service but could not reach the new SMTP service, confirming the restricted network path.

After DNS and delivery verification, merge only the `SMTP_*` fields from `nikkidodgephotography-smtp` into the app's configured runtime Secret, or add the SMTP Secret as a subsequent `envFrom` source during an authorized release. Its empty `SMTP_URL` prevents an obsolete URL from overriding the individual settings. Preserve every other application Secret key. The SMTP Secret is currently staged separately; it does not enable the unfinished booking release or change the existing app's mail transport automatically.
