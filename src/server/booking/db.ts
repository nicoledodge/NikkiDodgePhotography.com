import pg, { type PoolClient } from "pg";
const { Pool, types } = pg;
types.setTypeParser(1082, (value: string) => value);
export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 })
  : null;
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  if (!pool) throw new Error("Booking database is not configured.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Additive, serialized migrations. Existing CRM JSON and media are never rewritten.
export async function migrateBookingDatabase(): Promise<void> {
  await withTransaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(846191001)");
    await db.query(`
      CREATE TABLE IF NOT EXISTS booking_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS "user" (
        id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE, "emailVerified" boolean NOT NULL DEFAULT false,
        image text, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), role text NOT NULL DEFAULT 'client' CHECK(role IN ('admin','client')));
      CREATE TABLE IF NOT EXISTS session (
        id text PRIMARY KEY, "expiresAt" timestamptz NOT NULL, token text NOT NULL UNIQUE,
        "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL, "ipAddress" text, "userAgent" text,
        "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE);
      CREATE INDEX IF NOT EXISTS session_user_idx ON session("userId");
      CREATE TABLE IF NOT EXISTS account (
        id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL, "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz,
        scope text, password text, "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL,
        UNIQUE("providerId","accountId"));
      CREATE INDEX IF NOT EXISTS account_user_idx ON account("userId");
      CREATE TABLE IF NOT EXISTS verification (
        id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, "expiresAt" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now());
      CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification(identifier);
      CREATE TABLE IF NOT EXISTS booking_requests (
        id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES "user"(id), package_id text NOT NULL CHECK(package_id IN ('wedding','custom')),
        name text NOT NULL, telephone text NOT NULL, event_date date NOT NULL, location text NOT NULL, message text NOT NULL,
        status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','proposed','confirmed','expired','cancelled')),
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX IF NOT EXISTS booking_owner_idx ON booking_requests(user_id);
      CREATE TABLE IF NOT EXISTS templates (id uuid PRIMARY KEY, name text NOT NULL, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS proposals (
        id uuid PRIMARY KEY, booking_id uuid NOT NULL REFERENCES booking_requests(id), version integer NOT NULL,
        coverage text NOT NULL, total_cents integer NOT NULL CHECK(total_cents > 0), retainer_cents integer NOT NULL CHECK(retainer_cents > 0 AND retainer_cents <= total_cents),
        balance_due_date date NOT NULL, hold_expires_at timestamptz NOT NULL,
        status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','signed','expired','superseded','confirmed')),
        contract_snapshot text NOT NULL, contract_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(booking_id,version));
      CREATE TABLE IF NOT EXISTS proposal_signers (
        id uuid PRIMARY KEY, proposal_id uuid NOT NULL REFERENCES proposals(id), user_id text REFERENCES "user"(id),
        email text NOT NULL, name text NOT NULL, role text NOT NULL CHECK(role IN ('admin','client')), signed_at timestamptz,
        UNIQUE(proposal_id,email));
      CREATE TABLE IF NOT EXISTS signatures (
        id uuid PRIMARY KEY, signer_id uuid NOT NULL UNIQUE REFERENCES proposal_signers(id), proposal_id uuid NOT NULL REFERENCES proposals(id),
        legal_name text NOT NULL, method text NOT NULL CHECK(method IN ('typed','drawn')), signature text NOT NULL,
        consent_version text NOT NULL, ip text NOT NULL, user_agent text NOT NULL, signed_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS reservations (
        id uuid PRIMARY KEY, booking_id uuid NOT NULL REFERENCES booking_requests(id), proposal_id uuid NOT NULL UNIQUE REFERENCES proposals(id),
        event_date date NOT NULL, status text NOT NULL CHECK(status IN ('held','confirmed','released')));
      CREATE UNIQUE INDEX IF NOT EXISTS reservation_one_active_date ON reservations(event_date) WHERE status IN ('held','confirmed');
      CREATE TABLE IF NOT EXISTS payments (
        id uuid PRIMARY KEY, proposal_id uuid NOT NULL REFERENCES proposals(id), kind text NOT NULL CHECK(kind IN ('retainer','balance')),
        amount_cents integer NOT NULL CHECK(amount_cents > 0), stripe_session_id text UNIQUE, stripe_payment_intent text UNIQUE,
        checkout_expires_at timestamptz, checkout_url text, checkout_params jsonb,
        status text NOT NULL CHECK(status IN ('pending','paid','expired','failed','refunded')),
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
      CREATE UNIQUE INDEX IF NOT EXISTS payment_one_pending_kind ON payments(proposal_id,kind) WHERE status = 'pending';
      CREATE TABLE IF NOT EXISTS stripe_events (id text PRIMARY KEY, status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS audit_events (
        id uuid PRIMARY KEY, booking_id uuid REFERENCES booking_requests(id), proposal_id uuid REFERENCES proposals(id),
        event_type text NOT NULL, actor_id text, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS documents (
        id uuid PRIMARY KEY, proposal_id uuid NOT NULL REFERENCES proposals(id), kind text NOT NULL CHECK(kind IN ('contract','certificate')),
        storage_key text NOT NULL, sha256 text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(proposal_id,kind));
      CREATE TABLE IF NOT EXISTS notification_jobs (
        id uuid PRIMARY KEY, kind text NOT NULL, recipient text NOT NULL, payload jsonb NOT NULL,
        status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
        last_error text, created_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX IF NOT EXISTS notification_pending_idx ON notification_jobs(next_attempt_at) WHERE status = 'pending';
      INSERT INTO booking_migrations(version) VALUES (1) ON CONFLICT DO NOTHING;
    `);
  });
}
