import "dotenv/config";

const args = process.argv.slice(2);
const modeIndex = args.indexOf("--mode");
const mode = modeIndex >= 0 ? args[modeIndex + 1] : process.env.BOOKING_ENABLED === "true" ? "booking" : process.env.AUTH_ENABLED === "true" ? "auth" : "disabled";
if (!["disabled", "auth", "booking"].includes(mode)) {
  console.error("Usage: node scripts/check-booking-env.mjs [--mode auth|booking] [--database]");
  process.exit(1);
}
if (mode === "disabled") {
  console.error("Authentication is disabled. This release cannot replace the production admin until verified social admin access is ready.");
  process.exit(1);
}

let failures = 0;
const value = key => process.env[key]?.trim() || "";
const check = (label, valid) => {
  console.log(`[${valid ? "ready" : "missing/invalid"}] ${label}`);
  if (!valid) failures += 1;
};
const validUrl = (key, protocols) => {
  try { return protocols.includes(new URL(value(key)).protocol); } catch { return false; }
};
const production = process.env.NODE_ENV === "production";
check("AUTH_ENABLED", value("AUTH_ENABLED") === "true");
check("DATABASE_URL", validUrl("DATABASE_URL", ["postgres:", "postgresql:"]));
check("BETTER_AUTH_SECRET (at least 32 bytes)", Buffer.byteLength(value("BETTER_AUTH_SECRET")) >= 32);
for (const key of ["PUBLIC_APP_URL", "BETTER_AUTH_URL"]) check(key, validUrl(key, production ? ["https:"] : ["http:", "https:"]));
for (const provider of ["GOOGLE", "FACEBOOK", "MICROSOFT"]) {
  check(`${provider}_CLIENT_ID`, Boolean(value(`${provider}_CLIENT_ID`)));
  check(`${provider}_CLIENT_SECRET`, Boolean(value(`${provider}_CLIENT_SECRET`)));
}
if (mode === "booking") {
  check("BOOKING_ENABLED", value("BOOKING_ENABLED") === "true");
  check("STRIPE_SECRET_KEY", /^sk_(test|live)_/.test(value("STRIPE_SECRET_KEY")));
  check("STRIPE_PUBLISHABLE_KEY", /^pk_(test|live)_/.test(value("STRIPE_PUBLISHABLE_KEY")));
  check("Stripe secret/public key modes match", value("STRIPE_SECRET_KEY").split("_")[1] === value("STRIPE_PUBLISHABLE_KEY").split("_")[1]);
  check("STRIPE_WEBHOOK_SECRET", value("STRIPE_WEBHOOK_SECRET").startsWith("whsec_"));
  check("DOCUMENTS_S3_BUCKET", Boolean(value("DOCUMENTS_S3_BUCKET")));
  check("DOCUMENTS_S3_BUCKET separate from public media", Boolean(value("DOCUMENTS_S3_BUCKET")) && value("DOCUMENTS_S3_BUCKET") !== (value("CRM_S3_BUCKET") || value("APP_S3_BUCKET")));
  check("SMTP_FROM", Boolean(value("SMTP_FROM")));
  if (value("SMTP_URL")) {
    check("SMTP_URL", validUrl("SMTP_URL", ["smtp:", "smtps:"]));
  } else {
    for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"]) check(key, Boolean(value(key)));
    check("SMTP_PORT", Number.isInteger(Number(value("SMTP_PORT") || 587)) && Number(value("SMTP_PORT") || 587) > 0 && Number(value("SMTP_PORT") || 587) <= 65535);
  }
}

if (args.includes("--database") && !failures) {
  let pool;
  try {
    const { default: pg } = await import("pg");
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000 });
    await pool.query("SELECT 1");
    check("PostgreSQL connection", true);
    const admins = await pool.query(`SELECT EXISTS(SELECT 1 FROM "user" u JOIN account a ON a."userId" = u.id WHERE u.role = 'admin' AND u."emailVerified" = true AND a."providerId" IN ('google','facebook','microsoft')) AS ready`);
    check("Verified social admin bootstrap", admins.rows[0].ready === true);
    if (mode === "booking") {
      const templates = await pool.query("SELECT EXISTS(SELECT 1 FROM templates WHERE length(trim(body)) > 0) AS ready");
      check("Contract template present (owner approval must be verified separately)", templates.rows[0].ready === true);
    }
  } catch {
    check("Database connectivity/schema readiness", false);
  } finally {
    await pool?.end();
  }
}
console.log(failures ? `Readiness failed: ${failures} check(s). No values were displayed.` : "Configuration checks passed. Provider callbacks, payment webhooks, email delivery, and private storage still require an end-to-end test.");
process.exitCode = failures ? 1 : 0;
