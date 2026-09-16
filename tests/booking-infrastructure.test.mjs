import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const testDatabaseUrl = process.env.BOOKING_TEST_DATABASE_URL;
const repository = fileURLToPath(new URL("../", import.meta.url));

test("migrations, social admin bootstrap, and release readiness gates", { skip: !testDatabaseUrl }, async () => {
  const sourceUrl = new URL(testDatabaseUrl);
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(sourceUrl.hostname), "Infrastructure tests require an explicit loopback test PostgreSQL instance.");
  assert.notEqual(process.env.NODE_ENV, "production", "Infrastructure tests cannot run in production mode.");
  const name = `booking_infra_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Client({ connectionString: testDatabaseUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  sourceUrl.pathname = `/${name}`;
  const connectionString = sourceUrl.toString();
  const database = new pg.Client({ connectionString });
  await database.connect();
  const run = (script, args = [], extra = {}) => spawnSync(process.execPath, [`scripts/${script}`, ...args], {
    cwd: repository,
    env: { ...process.env, DATABASE_URL: connectionString, ...extra },
    encoding: "utf8",
    timeout: 20_000,
  });

  try {
    assert.equal(run("migrate-booking.mjs").status, 0, "Build the server before running this test.");
    const migrationCount = (await database.query("SELECT count(*) AS count FROM booking_migrations")).rows[0].count;
    assert.ok(Number(migrationCount) > 0);
    assert.equal(run("migrate-booking.mjs").status, 0, "Migrations must be safe to repeat.");
    assert.equal((await database.query("SELECT count(*) AS count FROM booking_migrations")).rows[0].count, migrationCount);

    const environment = {
      NODE_ENV: "production", AUTH_ENABLED: "true", BOOKING_ENABLED: "true",
      PUBLIC_APP_URL: "https://example.invalid", BETTER_AUTH_URL: "https://example.invalid",
      BETTER_AUTH_SECRET: "test-secret-with-more-than-thirty-two-bytes",
      STRIPE_SECRET_KEY: "sk_test_placeholder", STRIPE_PUBLISHABLE_KEY: "pk_test_placeholder", STRIPE_WEBHOOK_SECRET: "whsec_placeholder",
      DOCUMENTS_S3_BUCKET: "private-test-bucket", CRM_S3_BUCKET: "public-test-bucket",
      SMTP_URL: "smtp://user:password@localhost:2525", SMTP_FROM: "test@example.invalid",
    };
    for (const provider of ["GOOGLE", "FACEBOOK", "MICROSOFT"]) {
      environment[`${provider}_CLIENT_ID`] = "test-id";
      environment[`${provider}_CLIENT_SECRET`] = "test-secret";
    }
    assert.equal(run("check-booking-env.mjs", ["--mode", "auth", "--database"], environment).status, 1, "Admin cutover must fail before social admin bootstrap, even with booking disabled.");
    for (const [id, verified] of [["verified", true], ["unverified", false]]) {
      await database.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,$4)', [id, "Test", `${id}@example.invalid`, verified]);
      await database.query('INSERT INTO account(id,"accountId","providerId","userId","createdAt","updatedAt") VALUES($1,$2,$3,$4,now(),now())', [randomUUID(), `${id}-subject`, "google", id]);
    }
    await database.query('INSERT INTO session(id,"expiresAt",token,"createdAt","updatedAt","userId") VALUES($1,now()+interval \'1 day\',$2,now(),now(),$3)', [randomUUID(), randomUUID(), "verified"]);
    for (const subject of ["missing-subject", "unverified-subject"]) {
      assert.equal(run("bootstrap-booking-admin.mjs", ["--provider", "google", "--subject", subject]).status, 1);
    }
    for (let attempt = 0; attempt < 2; attempt += 1) {
      assert.equal(run("bootstrap-booking-admin.mjs", ["--provider", "google", "--subject", "verified-subject"]).status, 0);
    }
    assert.equal((await database.query('SELECT role FROM "user" WHERE id=$1', ["verified"])).rows[0].role, "admin");
    assert.equal((await database.query('SELECT role FROM "user" WHERE id=$1', ["unverified"])).rows[0].role, "client");
    assert.equal((await database.query('SELECT count(*) AS count FROM session WHERE "userId"=$1', ["verified"])).rows[0].count, "0");
    assert.equal((await database.query("SELECT count(*) AS count FROM audit_events WHERE event_type='admin.bootstrap'")).rows[0].count, "1");
    assert.equal(run("check-booking-env.mjs", ["--mode", "auth", "--database"], { ...environment, BOOKING_ENABLED: "false" }).status, 0);
    assert.equal(run("check-booking-env.mjs", ["--mode", "booking", "--database"], environment).status, 1, "A contract template is required before booking activation.");
    await database.query("INSERT INTO templates(id,name,body) VALUES($1,$2,$3)", [randomUUID(), "TEST ONLY", "Test fixture. This is not an approved contract."]);
    assert.equal(run("check-booking-env.mjs", ["--mode", "booking", "--database"], environment).status, 0);
    assert.equal(run("check-booking-env.mjs", ["--mode", "booking", "--database"], { ...environment, DOCUMENTS_S3_BUCKET: "public-test-bucket" }).status, 1);
    assert.equal(run("check-booking-env.mjs", [], { AUTH_ENABLED: "false", BOOKING_ENABLED: "false" }).status, 1);
  } finally {
    await database.end();
    await admin.query(`DROP DATABASE "${name}"`);
    await admin.end();
  }
});
