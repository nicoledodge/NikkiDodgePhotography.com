import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";

const args = process.argv.slice(2);
const providerIndex = args.indexOf("--provider");
const subjectIndex = args.indexOf("--subject");
const provider = providerIndex >= 0 ? args[providerIndex + 1] : "";
const subject = subjectIndex >= 0 ? args[subjectIndex + 1] : "";
if (!process.env.DATABASE_URL || !["google", "facebook", "microsoft"].includes(provider) || !subject || subject.startsWith("--")) {
  console.error("Usage: node scripts/bootstrap-booking-admin.mjs --provider google|facebook|microsoft --subject <verified-provider-account-id>. DATABASE_URL is required.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
let client;
try {
  client = await pool.connect();
  await client.query("BEGIN");
  const result = await client.query(`
    SELECT u.id, u.role, u."emailVerified"
    FROM "user" u JOIN account a ON a."userId" = u.id
    WHERE a."providerId" = $1 AND a."accountId" = $2
    FOR UPDATE OF u`, [provider, subject]);
  if (result.rows.length !== 1 || result.rows[0].emailVerified !== true) {
    throw new Error("The social account must exist and have a verified email before bootstrap.");
  }
  const user = result.rows[0];
  if (user.role !== "admin") {
    await client.query('UPDATE "user" SET role = $1, "updatedAt" = now() WHERE id = $2', ["admin", user.id]);
    await client.query("INSERT INTO audit_events(id,event_type,actor_id,details) VALUES($1,$2,$3,$4::jsonb)", [
      randomUUID(), "admin.bootstrap", user.id, JSON.stringify({ provider, source: "operator-cli" }),
    ]);
    // Require a fresh authenticated session after the role change.
    await client.query('DELETE FROM session WHERE "userId" = $1', [user.id]);
  }
  await client.query("COMMIT");
  console.log("Verified social account has the admin role. Sign in again to verify admin access.");
} catch {
  await client?.query("ROLLBACK").catch(() => {});
  console.error("Admin bootstrap did not report success. Verify the exact social provider subject, verified email, database permissions, and current role before retrying.");
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
