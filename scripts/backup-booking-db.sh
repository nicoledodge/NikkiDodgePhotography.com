#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${DATABASE_URL:?Load DATABASE_URL from a protected environment file}"
: "${BOOKING_BACKUP_DIR:?Set a backup directory outside the public web root}"
: "${BACKUP_AGE_RECIPIENT:?Set the public age encryption recipient; store its private key separately}"
for binary in node pg_dump pg_restore age; do
  command -v "$binary" >/dev/null 2>&1 || { echo "$binary is required" >&2; exit 1; }
done
mkdir -p "$BOOKING_BACKUP_DIR"
backup_name="booking-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
temporary_directory="$(mktemp -d "$BOOKING_BACKUP_DIR/.backup.XXXXXX")"
trap 'rm -rf "$temporary_directory"' EXIT
archive="$temporary_directory/$backup_name"
encrypted_archive="$BOOKING_BACKUP_DIR/$backup_name.age"

# Connection credentials stay in the child environment, never in command arguments.
# Split the URI explicitly: PGDATABASE is a database name, not a full URL.
if ! node - "$archive" <<'NODE'
const { spawnSync } = require('node:child_process');
try {
  const database = new URL(process.env.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) process.exit(1);
  const env = { ...process.env,
    PGHOST: database.hostname.replace(/^\[|\]$/g, ''),
    PGPORT: database.port || '5432',
    PGUSER: decodeURIComponent(database.username),
    PGPASSWORD: decodeURIComponent(database.password),
    PGDATABASE: decodeURIComponent(database.pathname.slice(1)),
  };
  const options = { sslmode: 'PGSSLMODE', sslrootcert: 'PGSSLROOTCERT', sslcert: 'PGSSLCERT', sslkey: 'PGSSLKEY', connect_timeout: 'PGCONNECT_TIMEOUT', application_name: 'PGAPPNAME', options: 'PGOPTIONS' };
  for (const [key, value] of database.searchParams) {
    if (!options[key]) throw new Error('Unsupported connection option');
    env[options[key]] = value;
  }
  const result = spawnSync('pg_dump', ['--format=custom', '--no-owner', '--no-acl', `--file=${process.argv[2]}`], { env, stdio: ['ignore', 'ignore', 'pipe'] });
  process.exit(result.status === 0 ? 0 : 1);
} catch { process.exit(1); }
NODE
then
  echo "Database backup failed. Verify database availability and pg_dump version." >&2; exit 1;
fi
pg_restore --list "$archive" >/dev/null
age --recipient "$BACKUP_AGE_RECIPIENT" --output "$encrypted_archive" "$archive"
if [[ -n "${BOOKING_BACKUP_S3_URI:-}" ]]; then
  command -v aws >/dev/null 2>&1 || { echo "aws is required for off-site upload" >&2; exit 1; }
  [[ "$BOOKING_BACKUP_S3_URI" == s3://* ]] || { echo "BOOKING_BACKUP_S3_URI must be an S3 URI" >&2; exit 1; }
  aws s3 cp "$encrypted_archive" "${BOOKING_BACKUP_S3_URI%/}/$backup_name.age" --sse AES256 --only-show-errors
  echo "Encrypted database backup created and uploaded to configured off-site storage."
else
  echo "Encrypted database backup created locally. Off-site upload is not configured."
fi
