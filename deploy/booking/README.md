# Booking deployment runbook

The currently deployed website and admin remain in service until this release passes the social authentication cutover gate. Disabling booking alone does not make this release safe to deploy: it replaces admin authentication. Existing CRM data, calendar, and public S3 assets are preserved. This directory is opt-in: the deploy workflow does not provision databases or buckets.

## Activation sequence

1. Provision a PostgreSQL database with backups, a private document bucket, OAuth applications, SMTP, and Stripe test-mode credentials. Keep `AUTH_ENABLED=false` and `BOOKING_ENABLED=false` initially. Do not replace the existing app Secret or public media bucket.
2. Merge the new runtime keys from `.env.example` into the existing Kubernetes app Secret using the approved secret manager. Set GitHub repository variables `APP_SECRET_NAME` and, if used, `APP_CONFIGMAP_NAME` to those resources. `AUTH_ENABLED` and `BOOKING_ENABLED` are explicit repository variables, both defaulting to `false`; they override Secret values to prevent accidental activation.
3. Build and test the complete release. Before replacing production, run the authentication stage as a separate restricted preview or one-off process connected to the target database, with `AUTH_ENABLED=true` and `BOOKING_ENABLED=false`. Register its exact OAuth callback. Run the migration command against that database first. Do not switch the public admin route yet.
4. Sign in once through the intended admin's social provider. From a trusted operator session with database access, run `node scripts/bootstrap-booking-admin.mjs --provider google --subject <exact-provider-account-id>`. Use the actual provider and subject from the identity provider and the matching account record, never a guessed email. The CLI requires an existing social account with a verified email, promotes it atomically, records an audit event, and revokes old sessions. Sign in again and verify admin authorization. The production deployment preflight always requires a verified social admin in the database, even when booking remains disabled. The release Job checks environment keys, runs additive migrations, and verifies the admin before changing the app Deployment. A failure preserves the existing Deployment. Re-run callback/admin smoke checks on the final production origin before opening access.
5. Have the owner approve the exact contract text, then add it through the contract-template admin flow. A nonempty template is a technical requirement, not evidence of legal or owner approval.
6. Test request → proposal → signatures → Stripe test payment → signed webhook → confirmation email → private documents. Test duplicate webhook delivery, wrong-client document access, expired holds, balance reminders, and cancellation. Test each advertised social provider's callback in the deployed domain. Test SMTP delivery to an inbox and failed-delivery retry behavior.
7. Run `node scripts/check-booking-env.mjs --mode booking --database` in the production-equivalent environment with the intended booking gate enabled. It checks names and readiness without printing secrets. Confirm private bucket access controls, a successful backup/restore drill, approved contract, and verified admin access separately. Only after these pass and activation is authorized should `BOOKING_ENABLED=true` be deployed. Live Stripe keys and webhook signing secret must come from the same Stripe account and mode.

The migration runner is `node scripts/migrate-booking.mjs` after `npm run build:server`. It imports `migrateBookingDatabase()` from the compiled server and closes the pool. It does not erase or rewrite legacy JSON/S3 CRM data. Run once as a release Job; the database migration also uses an advisory transaction lock to serialize concurrent runs.

## Environment and provider configuration

- `DATABASE_URL`: PostgreSQL connection string for the application role. Use a private network and TLS for managed/remote database connections. Prefer the provider's complete verified TLS configuration; do not globally disable certificate verification.
- `BETTER_AUTH_URL` and `PUBLIC_APP_URL`: the canonical HTTPS application origin in production. Use consistent origins and register exact provider callback URLs. Better Auth's standard callback path is `/api/auth/callback/<provider>`; verify the configured auth base path in the release before registering URLs.
- `BETTER_AUTH_SECRET`: independently generated random secret with at least 32 bytes; keep stable across replicas and deployments. Google, Facebook, and Microsoft each need their matching `*_CLIENT_ID` and `*_CLIENT_SECRET` keys. Changing an OAuth app or origin requires a new callback smoke test.
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET`: use test mode until acceptance passes. Register the exact webhook route implemented by the release and the event types handled in its webhook module. Deliver the untouched request body to signature verification before Express JSON parsing. Never confirm a payment from the browser return URL alone.
- `SMTP_URL`, or `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`; plus `SMTP_FROM`. Optional `SMTP_TLS_SERVERNAME` sets the certificate hostname and TLS SNI when the connection host uses private service DNS. It applies to both configuration styles and keeps certificate verification enabled. The sender domain must be authorized by the SMTP service. Existing `GMAIL_USER`/`GMAIL_PASS` keys alone do not configure this new SMTP transport.
- `DOCUMENTS_S3_BUCKET`: a dedicated private bucket, separate from `CRM_S3_BUCKET`/`APP_S3_BUCKET` and any public CDN bucket. Block public access, enable encryption and versioning, restrict the runtime role to the required document prefix, and verify an unauthenticated object request is denied. Optional `DOCUMENTS_S3_REGION` and `DOCUMENTS_S3_PREFIX` tune region/prefix. Do not set a public asset URL for signed documents. Preserve existing `CRM_S3_*` keys exactly.
- The document renderer uses `assets/fonts/NotoSans-Regular.ttf` and its accompanying license. `DOCUMENTS_FONT_PATH` optionally overrides the bundled font.

The environment checker verifies configuration shape and optional database prerequisites. It does not claim OAuth works, funds arrived, mail was delivered, a bucket is private, or contract text is approved.

### Private mailcow submission

See [MAIL-SETUP.md](MAIL-SETUP.md) for the deployed mailbox, DNS state, client settings, and pending edge-router activation.

Website notifications can use a private ClusterIP Service forwarding TCP 587 to the mailcow VM, with a NetworkPolicy allowing only the photography app's namespace and pod labels. The worker does not require public SMTP or IMAP access. For a service named `mailcow-submission` in the `mailcow` namespace, use:

```dotenv
SMTP_HOST=mailcow-submission.mailcow.svc.cluster.local
SMTP_PORT=587
SMTP_SECURE=false
SMTP_TLS_SERVERNAME=mail.miles.systems
```

Leave `SMTP_URL` empty when using these connection fields. Store the dedicated SMTP account in `SMTP_USER`/`SMTP_PASSWORD` and set `SMTP_FROM` to its authorized sender address through the app Secret. Port 587 uses STARTTLS; production requires TLS. The connection goes to the private service, while the certificate is verified against `mail.miles.systems`. The same hostname override can be used with `SMTP_URL`. In production, `smtp:` URLs require STARTTLS even if URL query options request an unencrypted fallback, and `smtps:` URLs use TLS immediately. Certificate verification stays enabled for both protocols.

## Optional self-hosted PostgreSQL

Prefer the organization's existing managed PostgreSQL service when available. `postgres.yaml` is a single-instance PostgreSQL 17 StatefulSet with a 10 GiB persistent volume, internal Service, restricted ingress, and a separate non-superuser application login. It is a practical starting point, not high availability or point-in-time recovery.

Before applying, choose the namespace and StorageClass, confirm durable volume snapshots/retention, and prepare off-site backups and alerting. Create a Kubernetes Secret named `booking-postgres-secret` containing independent generated `POSTGRES_PASSWORD` and `POSTGRES_APP_PASSWORD` values. Supply them through a protected secret manager or mode-0600 environment file; never commit the file or pass passwords as command arguments. The database name is `nikki_booking`; the application username is `booking_app`. Initialize once, then keep credentials stable. Changing Secret values does not change passwords in an existing database: rotate with an explicit coordinated database role change.

After authorization, apply with `kubectl -n <namespace> apply -f deploy/booking/postgres.yaml`, wait for `statefulset/booking-postgres`, and configure the app's `DATABASE_URL` for `booking-postgres:5432/nikki_booking`. If the app label differs from `nikkidodgephotography`, update the NetworkPolicy selector first. NetworkPolicy enforcement depends on the cluster CNI. This template has no public endpoint and assumes a trusted private cluster network; configure PostgreSQL TLS or a database operator before using an untrusted/shared network.

Do not delete the PVC during rollback. The initialization script runs only on an empty data directory. Back up and test restoration before a PostgreSQL major-version upgrade; do not simply change the container major tag on an existing volume.

## Backups and recovery

`scripts/backup-booking-db.sh` uses a PostgreSQL client version at least as new as the server, `pg_dump` custom format, and `age` encryption. Set `DATABASE_URL`, `BOOKING_BACKUP_DIR`, and public `BACKUP_AGE_RECIPIENT` in a protected environment. Keep the matching private age identity outside the database cluster and backup bucket. With `BOOKING_BACKUP_S3_URI=s3://<private-backup-bucket>/<prefix>` and an authorized AWS identity, the script also uploads the encrypted archive. It never prints connection values. Use a separate private backup bucket, not public portfolio storage.

Schedule the script in the existing backup runner at least daily and before releases; alert on failure or missing backups. The runner needs network access, Node.js, current PostgreSQL client tools, `age`, optional AWS CLI, a protected environment, and adequate temporary disk. In Kubernetes, label its Pod `component: booking-backup` for the supplied NetworkPolicy. Configure explicit off-site retention/lifecycle, for example 30 daily copies; this script intentionally does not delete backups. Also retain private document bucket versions. Database dumps do not include S3 documents or provide point-in-time recovery.

Restore to a separate empty database first. Decrypt using `age --decrypt --identity <protected-key-file> --output <private-temporary-file> <backup.dump.age>`, set connection credentials through protected `PGHOST`, `PGPORT`, `PGUSER`, and `PGPASSWORD` (or a mode-0600 `PGPASSFILE`), and run `pg_restore --no-owner --no-acl --exit-on-error --dbname=<recovery-database-name> <private-temporary-file>`. Restrict and remove the temporary plaintext file after the drill. Verify auth records, booking/proposal/payment/audit counts, private document availability, and disabled outbound email/payment workers before promoting a recovery database. Never restore over the live database as a test. Track the last successful restore drill.

PostgreSQL references: [custom-format backups](https://www.postgresql.org/docs/17/app-pgdump.html), [archive restoration](https://www.postgresql.org/docs/17/app-pgrestore.html). Kubernetes reference: [persistent stateful applications](https://kubernetes.io/docs/tasks/run-application/run-single-instance-stateful-application/).

## Rollback and monitoring

Before launch, keep `BOOKING_ENABLED=false` and the established inquiry path available. After launch, disabling booking closes intake but does not resolve in-flight payments or holds; preserve the authenticated portal, signed webhook processing, scheduled jobs, database, and documents until pending work is reconciled. Roll back only to an application version compatible with the additive schema and payment records. Do not roll back by dropping tables.

Watch Deployment readiness and `/api/health`, failed migration Jobs, Stripe webhook errors/retries, notification backlog, expired reservations, database disk utilization, and backup age. Treat successful image push separately from successful rollout. `scripts/deploy-k8s.sh` now fails the release when rollout status fails. Protect the release branch and production secrets; rotate any credentials previously committed to repository history.
