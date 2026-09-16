import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { serializeSignedCookie } from "better-call";
import type { Server } from "node:http";
import type { BookingUser } from "../src/shared/booking.js";

const source = process.env.BOOKING_TEST_DATABASE_URL;
if (!source)
  throw new Error(
    "Set BOOKING_TEST_DATABASE_URL to a disposable local PostgreSQL instance.",
  );
const url = new URL(source);
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  throw new Error("Tests require a local disposable PostgreSQL instance.");
const databaseName = `nikki_service_test_${process.pid}`;
const adminPool = new pg.Pool({ connectionString: source });
let db: typeof import("../src/server/booking/db.js");
let service: typeof import("../src/server/booking/service.js");
let signing: typeof import("../src/server/booking/signing.js");
let documents: typeof import("../src/server/booking/documents.js");
let server: Server;
let origin: string;
let authCookie: string;
const users: BookingUser[] = ["admin", "client", "other", "partner"].map(
  (role, i) => ({
    id: randomUUID(),
    name: `Test ${role}`,
    email: `booking-${role}-${process.pid}@example.test`,
    emailVerified: true,
    role: i === 0 ? "admin" : "client",
  }),
);
const [nikki, client, other, partner] = users;
let templateId: string;
const signature = (name: string) => ({
  legalName: name,
  method: "typed" as const,
  consentAccepted: true,
  intentAccepted: true,
  authorityAccepted: true,
  consentVersion: "2026-09-16",
});
const request = (eventDate: string) => ({
  packageId: "wedding",
  name: "Test Couple",
  telephone: "555-0100",
  eventDate,
  location: "Test venue",
  message: "Automated local test request.",
});
const proposal = (signerUsers = [client]) => ({
  coverage: "Eight hours of photography",
  totalCents: 300000,
  retainerCents: 100000,
  balanceDueDate: "2099-01-01",
  holdExpiresAt: new Date(Date.now() + 86400000).toISOString(),
  signers: signerUsers.map((u) => ({ name: u.name, email: u.email })),
  contractTemplateId: templateId,
});

before(async () => {
  await adminPool.query(`CREATE DATABASE ${databaseName}`);
  url.pathname = `/${databaseName}`;
  process.env.DATABASE_URL = url.toString();
  process.env.AUTH_ENABLED = "true";
  process.env.BOOKING_ENABLED = "true";
  process.env.BETTER_AUTH_SECRET = "test-only-secret-at-least-32-characters";
  process.env.BETTER_AUTH_URL = "http://localhost:5173";
  process.env.PUBLIC_APP_URL = "http://localhost:5173";
  for (const provider of ["GOOGLE", "FACEBOOK", "MICROSOFT"]) {
    process.env[`${provider}_CLIENT_ID`] = "test-client";
    process.env[`${provider}_CLIENT_SECRET`] = "test-secret";
  }
  db = await import("../src/server/booking/db.js");
  await db.migrateBookingDatabase();
  service = await import("../src/server/booking/service.js");
  signing = await import("../src/server/booking/signing.js");
  documents = await import("../src/server/booking/documents.js");
  for (const u of users)
    await db.pool!.query(
      `INSERT INTO "user"(id,name,email,"emailVerified",role) VALUES($1,$2,$3,true,$4)`,
      [u.id, u.name, u.email, u.role],
    );
  templateId = randomUUID();
  await db.pool!.query("INSERT INTO templates(id,name,body) VALUES($1,$2,$3)", [
    templateId,
    "TEST ONLY",
    "Test agreement for {{client_names}}. Coverage: {{coverage}}. Total: {{total}}.",
  ]);
  const { auth } = await import("../src/server/booking/auth.js");
  const { bookingRouter } = await import("../src/server/booking/router.js");
  const app = express();
  app.all("/api/auth/*", toNodeHandler(auth!));
  app.use(express.json());
  app.use("/api/booking", bookingRouter);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  origin = `http://127.0.0.1:${address.port}`;
  const token = randomUUID();
  await db.pool!.query(
    `INSERT INTO session(id,token,"userId","createdAt","updatedAt","expiresAt") VALUES($1,$2,$3,now(),now(),now()+interval '1 day')`,
    [randomUUID(), token, client.id],
  );
  authCookie = (
    await serializeSignedCookie(
      "better-auth.session_token",
      token,
      process.env.BETTER_AUTH_SECRET,
    )
  ).split(";")[0];
});
after(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  await db?.pool?.end();
  await adminPool.query(`DROP DATABASE IF EXISTS ${databaseName}`);
  await adminPool.end();
});

test("OAuth-only authentication starts all three providers and rejects password login", async () => {
  for (const provider of ["google", "facebook", "microsoft"]) {
    const response = await fetch(`${origin}/api/auth/sign-in/social`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({
        provider,
        callbackURL: "http://localhost:5173/book?package=wedding",
      }),
    });
    assert.equal(response.status, 200, await response.clone().text());
    const payload = await response.json();
    assert.match(payload.url, /^https:\/\//);
    assert.match(payload.url, /(state|request_uri)=/);
  }
  const password = await fetch(`${origin}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ email: client.email, password: "anything" }),
  });
  assert.notEqual(password.status, 200);
});
test("server authorization rejects anonymous, nonadmin, and cross-origin booking requests", async () => {
  assert.equal((await fetch(`${origin}/api/booking/bookings`)).status, 401);
  const session = await fetch(`${origin}/api/booking/session`, {
    headers: { Cookie: authCookie },
  });
  assert.equal((await session.json()).user.id, client.id);
  assert.equal(
    (
      await fetch(`${origin}/api/booking/admin/bookings`, {
        headers: { Cookie: authCookie },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${origin}/api/booking/bookings`, {
        method: "POST",
        headers: {
          Cookie: authCookie,
          Origin: "https://evil.example",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request("2099-03-01")),
      })
    ).status,
    403,
  );
});
test("date requests require verified email and preserve chosen coverage", async () => {
  const response = await fetch(`${origin}/api/booking/bookings`, {
    method: "POST",
    headers: {
      Cookie: authCookie,
      Origin: "http://localhost:5173",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request("2099-03-02")),
  });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).packageId, "wedding");
  await db.pool!.query('UPDATE "user" SET "emailVerified"=false WHERE id=$1', [
    client.id,
  ]);
  const denied = await fetch(`${origin}/api/booking/bookings`, {
    method: "POST",
    headers: {
      Cookie: authCookie,
      Origin: "http://localhost:5173",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request("2099-03-03")),
  });
  assert.equal(denied.status, 403);
  await db.pool!.query('UPDATE "user" SET "emailVerified"=true WHERE id=$1', [
    client.id,
  ]);
});
test("simultaneous approval of one date grants only one reservation", async () => {
  const first = await service.createBooking(client, request("2099-04-01"));
  const second = await service.createBooking(client, request("2099-04-01"));
  const results = await Promise.allSettled([
    service.createProposal(nikki, first.id, proposal()),
    service.createProposal(nikki, second.id, proposal()),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    (
      await db.pool!.query(
        "SELECT id FROM reservations WHERE event_date='2099-04-01' AND status='held'",
      )
    ).rowCount,
    1,
  );
});
test("multi-signer contract freezes content, requires Nikki first, and isolates client access", async () => {
  const booking = await service.createBooking(client, request("2099-05-01"));
  const p = await service.createProposal(
    nikki,
    booking.id,
    proposal([client, partner]),
  );
  assert.match(p.contractSnapshot, /\$3,000\.00/);
  await assert.rejects(service.bookingDetail(other, booking.id));
  assert.equal(
    (await service.bookingDetail(client, booking.id)).proposal,
    null,
    "Unissued draft stays private",
  );
  await assert.rejects(
    signing.signProposal(client, p.id, signature(client.name), {
      ip: "127.0.0.1",
      userAgent: "local-test",
    }),
    /not open/,
  );
  await signing.signProposal(nikki, p.id, signature(nikki.name), {
    ip: "127.0.0.1",
    userAgent: "local-test",
  });
  assert.equal(
    (await service.bookingDetail(client, booking.id)).proposal?.status,
    "sent",
  );
  assert.equal(
    (await service.listBookings(partner)).some((b) => b.id === booking.id),
    true,
  );
  await signing.signProposal(client, p.id, signature(client.name), {
    ip: "127.0.0.1",
    userAgent: "local-test",
  });
  assert.equal(
    (await service.bookingDetail(client, booking.id)).proposal?.status,
    "sent",
  );
  await signing.signProposal(partner, p.id, signature(partner.name), {
    ip: "127.0.0.1",
    userAgent: "local-test",
  });
  assert.equal(
    (await service.bookingDetail(client, booking.id)).proposal?.status,
    "signed",
  );
  await signing.signProposal(partner, p.id, signature(partner.name), {
    ip: "127.0.0.1",
    userAgent: "local-test",
  });
  assert.equal(
    (
      await db.pool!.query("SELECT id FROM signatures WHERE proposal_id=$1", [
        p.id,
      ])
    ).rowCount,
    3,
  );
  await documents.generateProposalDocuments(p.id);
  const doc = await documents.getDocument(client, p.id, "contract");
  assert.equal(doc.buffer.subarray(0, 4).toString(), "%PDF");
  await assert.rejects(
    documents.getDocument(other, p.id, "contract"),
    /different client/,
  );
  await db.pool!.query(
    "UPDATE templates SET body='Changed template' WHERE id=$1",
    [templateId],
  );
  assert.equal(
    (await service.bookingDetail(client, booking.id)).contractText,
    p.contractSnapshot,
  );
  await db.pool!.query(
    "UPDATE templates SET body='TEST ONLY {{client_names}} {{total}}' WHERE id=$1",
    [templateId],
  );
});
test("replacement proposals invalidate old signing and unsigned expired holds release", async () => {
  const booking = await service.createBooking(client, request("2099-06-01"));
  const old = await service.createProposal(nikki, booking.id, proposal());
  await signing.signProposal(nikki, old.id, signature(nikki.name), {
    ip: "127.0.0.1",
    userAgent: "local-test",
  });
  const next = await service.createProposal(nikki, booking.id, {
    ...proposal(),
    totalCents: 350000,
  });
  assert.equal(next.version, 2);
  await assert.rejects(
    signing.signProposal(client, old.id, signature(client.name), {
      ip: "127.0.0.1",
      userAgent: "local-test",
    }),
  );
  await db.pool!.query(
    "UPDATE proposals SET hold_expires_at=now()-interval '1 minute' WHERE id=$1",
    [next.id],
  );
  const { reconcileExpiredHolds } = await import(
    "../src/server/booking/payments.js"
  );
  await reconcileExpiredHolds();
  assert.equal(
    (
      await db.pool!.query(
        "SELECT status FROM reservations WHERE proposal_id=$1",
        [next.id],
      )
    ).rows[0].status,
    "released",
  );
  assert.equal(
    (
      await db.pool!.query("SELECT status FROM booking_requests WHERE id=$1", [
        booking.id,
      ])
    ).rows[0].status,
    "expired",
  );
});
test("a bound signer's old email cannot grant access to another identity", async () => {
  const booking = await service.createBooking(client, request("2099-07-01"));
  const p = await service.createProposal(
    nikki,
    booking.id,
    proposal([client, partner]),
  );
  await signing.signProposal(nikki, p.id, signature(nikki.name), {
    ip: "127.0.0.1",
    userAgent: "local-test",
  });
  await signing.signProposal(partner, p.id, signature(partner.name), {
    ip: "127.0.0.1",
    userAgent: "local-test",
  });
  const impersonator = { ...other, email: partner.email };
  await assert.rejects(service.bookingDetail(impersonator, booking.id));
  assert.equal(
    (await service.listBookings(impersonator)).some((b) => b.id === booking.id),
    false,
  );
  const changedEmail = { ...partner, email: "changed@example.test" };
  assert.equal(
    (await service.bookingDetail(changedEmail, booking.id)).booking.id,
    booking.id,
  );
});
test(
  "calendar writers use their locked connection without exhausting the pool",
  { timeout: 5000 },
  async () => {
    await Promise.all(
      Array.from({ length: 15 }, () =>
        service.withScheduleLock(async (connection) => {
          await service.assertNoReservationConflict(
            "2098-01-01T00:00:00Z",
            "2098-01-02T00:00:00Z",
            connection,
          );
        }),
      ),
    );
  },
);
test("pausing intake preserves client access and rejects new date requests", async () => {
  process.env.BOOKING_ENABLED = "false";
  try {
    const headers = {
      Cookie: authCookie,
      Origin: "http://localhost:5173",
      "Content-Type": "application/json",
    };
    assert.equal(
      (await fetch(`${origin}/api/booking/bookings`, { headers })).status,
      200,
    );
    for (const route of ["bookings", "bookings/", "BOOKINGS"]) assert.equal(
      (
        await fetch(`${origin}/api/booking/${route}`, {
          method: "POST",
          headers,
          body: JSON.stringify(request("2099-08-01")),
        })
      ).status,
      503,
    );
  } finally {
    process.env.BOOKING_ENABLED = "true";
  }
});
