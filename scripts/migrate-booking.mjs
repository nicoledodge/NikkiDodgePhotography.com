import "dotenv/config";

if (!process.env.DATABASE_URL?.trim()) {
  console.error("Booking migration requires DATABASE_URL.");
  process.exit(1);
}

let database;
try {
  database = await import("../dist-server/server/booking/db.js");
  await database.migrateBookingDatabase();
  console.log("Booking database migrations completed.");
} catch (error) {
  // Database errors can contain connection details or SQL values. Never print them.
  const code = typeof error?.code === "string" && /^[A-Z0-9_]+$/.test(error.code) ? ` (${error.code})` : "";
  console.error(`Booking migration failed${code}. Check database access and the compiled server build.`);
  process.exitCode = 1;
} finally {
  await database?.pool?.end();
}
