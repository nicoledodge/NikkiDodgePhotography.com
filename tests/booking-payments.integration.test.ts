import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Stripe from "stripe";
import {
  pool,
  migrateBookingDatabase,
  withTransaction,
} from "../src/server/booking/db.js";
import {
  handleStripeWebhook,
  createCheckout,
} from "../src/server/booking/payments.js";
import { getDocument } from "../src/server/booking/documents.js";
import {
  snapshotHash,
  signProposal,
  CONSENT_VERSION,
} from "../src/server/booking/signing.js";

const enabled =
  process.env.BOOKING_INTEGRATION_TEST === "true" && Boolean(pool);
process.env.STRIPE_SECRET_KEY = "sk_test_booking_automated_tests";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_booking_automated_tests";
process.env.PUBLIC_APP_URL = "https://photography.example.test";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
async function seed() {
  const booking = randomUUID(),
    proposal = randomUUID(),
    payment = randomUUID(),
    client = `test-${randomUUID()}`,
    admin = `test-${randomUUID()}`;
  const session = `cs_test_${randomUUID()}`;
  const year = 2100 + Math.floor(Math.random() * 1000);
  await withTransaction(async (db) => {
    await db.query(
      `INSERT INTO "user" (id,name,email,"emailVerified",role) VALUES ($1,'Test client',$2,true,'client'),($3,'Test admin',$4,true,'admin')`,
      [client, `${client}@example.test`, admin, `${admin}@example.test`],
    );
    await db.query(
      `INSERT INTO booking_requests (id,user_id,package_id,name,telephone,event_date,location,message) VALUES ($1,$2,'wedding','Test client','1234567890',$3,'Test venue','Automated test')`,
      [booking, client, `${year}-08-20`],
    );
    await db.query(
      `INSERT INTO proposals (id,booking_id,version,coverage,total_cents,retainer_cents,balance_due_date,hold_expires_at,status,contract_snapshot,contract_hash)
            VALUES ($1,$2,1,'Test',500000,250000,$3,NOW()+interval '2 hours','signed','Test approved contract',$4)`,
      [
        proposal,
        booking,
        `${year}-07-20`,
        snapshotHash("Test approved contract"),
      ],
    );
    await db.query(
      `INSERT INTO proposal_signers (id,proposal_id,user_id,email,name,role,signed_at) VALUES ($1,$2,$3,$4,'Client','client',NOW()),($5,$2,$6,$7,'Admin','admin',NOW())`,
      [
        randomUUID(),
        proposal,
        client,
        `${client}@example.test`,
        randomUUID(),
        admin,
        `${admin}@example.test`,
      ],
    );
    await db.query(
      `INSERT INTO reservations (id,booking_id,proposal_id,event_date,status) VALUES ($1,$2,$3,$4,'held')`,
      [randomUUID(), booking, proposal, `${year}-08-20`],
    );
    await db.query(
      `INSERT INTO payments (id,proposal_id,kind,amount_cents,stripe_session_id,status) VALUES ($1,$2,'retainer',250000,$3,'pending')`,
      [payment, proposal, session],
    );
  });
  const payload = {
    id: session,
    object: "checkout.session",
    mode: "payment",
    status: "complete",
    currency: "usd",
    amount_total: 250000,
    client_reference_id: payment,
    metadata: { paymentId: payment, proposalId: proposal, kind: "retainer" },
    payment_status: "paid",
    payment_intent: `pi_test_${randomUUID()}`,
  };
  async function cleanup() {
    await withTransaction(async (db) => {
      await db.query(
        `DELETE FROM notification_jobs WHERE payload->>'proposalId'=$1`,
        [proposal],
      );
      await db.query("DELETE FROM audit_events WHERE proposal_id=$1", [
        proposal,
      ]);
      await db.query("DELETE FROM documents WHERE proposal_id=$1", [proposal]);
      await db.query("DELETE FROM payments WHERE proposal_id=$1", [proposal]);
      await db.query("DELETE FROM reservations WHERE proposal_id=$1", [
        proposal,
      ]);
      await db.query("DELETE FROM proposal_signers WHERE proposal_id=$1", [
        proposal,
      ]);
      await db.query("DELETE FROM proposals WHERE id=$1", [proposal]);
      await db.query("DELETE FROM booking_requests WHERE id=$1", [booking]);
      await db.query('DELETE FROM "user" WHERE id=ANY($1::text[])', [
        [client, admin],
      ]);
    });
  }
  return { booking, proposal, payment, payload, cleanup, client };
}
async function dispatch(
  payload: unknown,
  type = "checkout.session.completed",
  id = `evt_test_${randomUUID()}`,
) {
  const body = JSON.stringify({
    id,
    object: "event",
    type,
    data: { object: payload },
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
  const result = await handleStripeWebhook(Buffer.from(body), signature);
  return { id, result };
}
test(
  "verified webhook deduplicates and confirms only after the retainer is paid",
  { skip: !enabled },
  async (t) => {
    await migrateBookingDatabase();
    const data = await seed();
    const eventIds: string[] = [];
    t.after(async () => {
      await data.cleanup();
      await pool!.query("DELETE FROM stripe_events WHERE id=ANY($1::text[])", [
        eventIds,
      ]);
    });
    const id = `evt_test_${randomUUID()}`;
    eventIds.push(id);
    const first = await dispatch(data.payload, undefined, id);
    const duplicate = await dispatch(data.payload, undefined, id);
    assert.equal(first.result.duplicate, false);
    assert.equal(duplicate.result.duplicate, true);
    assert.equal(
      (
        await pool!.query("SELECT status FROM booking_requests WHERE id=$1", [
          data.booking,
        ])
      ).rows[0].status,
      "confirmed",
    );
    assert.equal(
      (
        await pool!.query(
          "SELECT status FROM reservations WHERE proposal_id=$1",
          [data.proposal],
        )
      ).rows[0].status,
      "confirmed",
    );
    assert.equal(
      (
        await pool!.query(
          `SELECT count(*)::integer AS count FROM audit_events WHERE proposal_id=$1 AND event_type='payment_received'`,
          [data.proposal],
        )
      ).rows[0].count,
      1,
    );
  },
);
test(
  "unpaid completion does not confirm; later paid event does",
  { skip: !enabled },
  async (t) => {
    const data = await seed();
    const eventIds: string[] = [];
    t.after(async () => {
      await data.cleanup();
      await pool!.query("DELETE FROM stripe_events WHERE id=ANY($1::text[])", [
        eventIds,
      ]);
    });
    eventIds.push(
      (await dispatch({ ...data.payload, payment_status: "unpaid" })).id,
    );
    assert.equal(
      (
        await pool!.query(
          "SELECT status FROM reservations WHERE proposal_id=$1",
          [data.proposal],
        )
      ).rows[0].status,
      "held",
    );
    eventIds.push(
      (await dispatch(data.payload, "checkout.session.async_payment_succeeded"))
        .id,
    );
    assert.equal(
      (
        await pool!.query(
          "SELECT status FROM reservations WHERE proposal_id=$1",
          [data.proposal],
        )
      ).rows[0].status,
      "confirmed",
    );
  },
);
test(
  "signed but mismatched amount rolls back event and does not mark payment paid",
  { skip: !enabled },
  async (t) => {
    const data = await seed();
    t.after(data.cleanup);
    const eventId = `evt_test_${randomUUID()}`;
    await assert.rejects(
      dispatch(
        { ...data.payload, amount_total: 1 },
        "checkout.session.completed",
        eventId,
      ),
      /does not match/,
    );
    assert.equal(
      (
        await pool!.query("SELECT status FROM payments WHERE id=$1", [
          data.payment,
        ])
      ).rows[0].status,
      "pending",
    );
    assert.equal(
      (await pool!.query("SELECT id FROM stripe_events WHERE id=$1", [eventId]))
        .rowCount,
      0,
    );
  },
);
test(
  "webhook payload tampering fails signature validation before database writes",
  { skip: !enabled },
  async () => {
    const raw = '{"id":"evt_test_tampered"}';
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: raw,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
    });
    await assert.rejects(
      handleStripeWebhook(Buffer.from(raw + " "), signature),
      /Invalid payment webhook signature/,
    );
  },
);
test(
  "late paid event records payment but cannot claim a released date",
  { skip: !enabled },
  async (t) => {
    const data = await seed();
    const eventIds: string[] = [];
    t.after(async () => {
      await data.cleanup();
      await pool!.query("DELETE FROM stripe_events WHERE id=ANY($1::text[])", [
        eventIds,
      ]);
    });
    await pool!.query(
      "UPDATE reservations SET status='released' WHERE proposal_id=$1",
      [data.proposal],
    );
    await pool!.query("UPDATE proposals SET status='expired' WHERE id=$1", [
      data.proposal,
    ]);
    eventIds.push((await dispatch(data.payload)).id);
    assert.equal(
      (
        await pool!.query(
          "SELECT status FROM reservations WHERE proposal_id=$1",
          [data.proposal],
        )
      ).rows[0].status,
      "released",
    );
    assert.equal(
      (
        await pool!.query("SELECT status FROM payments WHERE id=$1", [
          data.payment,
        ])
      ).rows[0].status,
      "paid",
    );
    assert.equal(
      (
        await pool!.query(
          "SELECT count(*)::integer AS count FROM notification_jobs WHERE payload->>'proposalId'=$1 AND payload->>'subject'='Payment needs reservation review'",
          [data.proposal],
        )
      ).rows[0].count,
      1,
    );
  },
);
test(
  "refund delivered before checkout completion prevents false confirmation",
  { skip: !enabled },
  async (t) => {
    const data = await seed();
    const eventIds: string[] = [];
    t.after(async () => {
      await data.cleanup();
      await pool!.query("DELETE FROM stripe_events WHERE id=ANY($1::text[])", [
        eventIds,
      ]);
    });
    eventIds.push(
      (
        await dispatch(
          {
            id: "ch_test_refunded",
            object: "charge",
            payment_intent: data.payload.payment_intent,
            metadata: data.payload.metadata,
            currency: "usd",
            amount: 250000,
            amount_refunded: 250000,
            refunded: true,
          },
          "charge.refunded",
        )
      ).id,
    );
    eventIds.push((await dispatch(data.payload)).id);
    assert.equal(
      (
        await pool!.query("SELECT status FROM payments WHERE id=$1", [
          data.payment,
        ])
      ).rows[0].status,
      "refunded",
    );
    assert.equal(
      (
        await pool!.query(
          "SELECT status FROM reservations WHERE proposal_id=$1",
          [data.proposal],
        )
      ).rows[0].status,
      "held",
    );
  },
);
test(
  "bound account can sign and access documents after email change; old email on another account cannot",
  { skip: !enabled },
  async (t) => {
    const data = await seed();
    const directory = await mkdtemp(path.join(tmpdir(), "booking-doc-auth-"));
    const previousDir = process.env.DOCUMENTS_LOCAL_DIR;
    process.env.DOCUMENTS_LOCAL_DIR = directory;
    t.after(async () => {
      await data.cleanup();
      await rm(directory, { recursive: true, force: true });
      if (previousDir) process.env.DOCUMENTS_LOCAL_DIR = previousDir;
      else delete process.env.DOCUMENTS_LOCAL_DIR;
    });
    const original = {
      id: data.client,
      name: "Client",
      email: "changed@example.test",
      role: "client",
      emailVerified: true,
    };
    const other = {
      ...original,
      id: "different-account",
      email: `${data.client}@example.test`,
    };
    const input = {
      legalName: "Client Example",
      method: "typed" as const,
      consentAccepted: true,
      intentAccepted: true,
      authorityAccepted: true,
      consentVersion: CONSENT_VERSION,
    };
    assert.equal(
      (
        await signProposal(original, data.proposal, input, {
          ip: "192.0.2.1",
          userAgent: "Test",
        })
      ).ok,
      true,
    );
    await assert.rejects(
      signProposal(other, data.proposal, input, {
        ip: "192.0.2.1",
        userAgent: "Test",
      }),
      /different signer/,
    );
    const bytes = Buffer.from("%PDF-test-private-document");
    await writeFile(path.join(directory, "contract.pdf"), bytes);
    await pool!.query(
      "INSERT INTO documents (id,proposal_id,kind,storage_key,sha256) VALUES ($1,$2,'contract','contract.pdf',$3)",
      [
        randomUUID(),
        data.proposal,
        createHash("sha256").update(bytes).digest("hex"),
      ],
    );
    assert.deepEqual(
      (await getDocument(original, data.proposal, "contract")).buffer,
      bytes,
    );
    await assert.rejects(
      getDocument(other, data.proposal, "contract"),
      /different client/,
    );
    // Stop before the external payment API while checking the authorization branch.
    await pool!.query("UPDATE proposals SET status='draft' WHERE id=$1", [
      data.proposal,
    ]);
    await assert.rejects(
      createCheckout(original, data.proposal, "retainer"),
      /signed proposal with an active date hold/,
    );
    await assert.rejects(
      createCheckout(other, data.proposal, "retainer"),
      /different client/,
    );
  },
);
test.after(async () => {
  await pool?.end();
});
