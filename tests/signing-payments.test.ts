import test from "node:test";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import type Stripe from "stripe";
import {
  assertFrozenContract,
  snapshotHash,
  validateSignatureInput,
  requireVerifiedActor,
  CONSENT_VERSION,
  isAssignedSigner,
} from "../src/server/booking/signing.js";
import {
  checkoutExpiry,
  assertSessionMatchesPayment,
} from "../src/server/booking/payments.js";
import { renderSignedDocuments } from "../src/server/booking/documents.js";

const input = {
  legalName: "Nicole Dodge",
  method: "typed" as const,
  consentAccepted: true,
  intentAccepted: true,
  authorityAccepted: true,
  consentVersion: CONSENT_VERSION,
  isAssignedSigner,
};
test("signatures require verified identity and every current consent", async () => {
  assert.throws(() =>
    requireVerifiedActor({
      id: "client",
      email: "a@example.test",
      name: "Client",
      role: "client",
      emailVerified: false,
    }),
  );
  assert.equal((await validateSignatureInput(input)).signature, "Nicole Dodge");
  for (const field of [
    "consentAccepted",
    "intentAccepted",
    "authorityAccepted",
  ] as const) {
    await assert.rejects(validateSignatureInput({ ...input, [field]: false }));
  }
  await assert.rejects(
    validateSignatureInput({ ...input, consentVersion: "outdated" }),
  );
  await assert.rejects(
    validateSignatureInput({ ...input, legalName: "Inj\nection" }),
  );
});
test("frozen contract cannot be changed after the signer reviewed it", () => {
  const source = "Client-approved agreement version 1.";
  assert.doesNotThrow(() => assertFrozenContract(source, snapshotHash(source)));
  assert.throws(() =>
    assertFrozenContract(source + "\nChanged fee.", snapshotHash(source)),
  );
  assert.throws(() => assertFrozenContract("", snapshotHash("")));
});
test("drawn signature rejects mislabeled, blank and invisible payloads", async () => {
  await assert.rejects(
    validateSignatureInput({
      ...input,
      method: "drawn",
      signature: "data:image/png;base64,PGh0bWw+",
    }),
  );
  const blank = await sharp({
    create: { width: 100, height: 50, channels: 4, background: "#ffffff" },
  })
    .png()
    .toBuffer();
  await assert.rejects(
    validateSignatureInput({
      ...input,
      method: "drawn",
      signature: `data:image/png;base64,${blank.toString("base64")}`,
    }),
  );
  const invisible = await sharp({
    create: { width: 100, height: 50, channels: 4, background: "#00000000" },
  })
    .png()
    .toBuffer();
  await assert.rejects(
    validateSignatureInput({
      ...input,
      method: "drawn",
      signature: `data:image/png;base64,${invisible.toString("base64")}`,
    }),
  );
  const visible = await sharp(
    Buffer.from(
      '<svg width="300" height="100"><rect width="300" height="100" fill="white"/><path d="M20 80 L70 20 L120 70 L240 30" stroke="black" stroke-width="3" fill="none"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  const validated = await validateSignatureInput({
    ...input,
    method: "drawn",
    signature: `data:image/png;base64,${visible.toString("base64")}`,
  });
  assert.match(validated.signature, /^data:image\/png;base64,/);
});
test("checkout expiry respects hold deadline and rejects a nearly expired hold", () => {
  const now = Date.parse("2026-09-16T10:00:00Z");
  assert.equal(
    checkoutExpiry("retainer", "2026-09-16T12:00:00Z", now),
    Date.parse("2026-09-16T12:00:00Z") / 1000,
  );
  assert.throws(() => checkoutExpiry("retainer", "2026-09-16T10:30:00Z", now));
  assert.equal(
    checkoutExpiry("balance", "2026-09-15T00:00:00Z", now),
    now / 1000 + 23 * 60 * 60,
  );
});
test("Stripe payment must match server amount, currency, proposal, kind and session", () => {
  const payment = {
    id: "payment-1",
    proposal_id: "proposal-1",
    kind: "retainer" as const,
    amount_cents: 250000,
    stripe_session_id: "cs_test_valid",
  };
  const session = {
    id: "cs_test_valid",
    mode: "payment",
    currency: "usd",
    amount_total: 250000,
    client_reference_id: "payment-1",
    metadata: {
      paymentId: "payment-1",
      proposalId: "proposal-1",
      kind: "retainer",
    },
  } as Stripe.Checkout.Session;
  assert.doesNotThrow(() => assertSessionMatchesPayment(session, payment));
  for (const changed of [
    { amount_total: 1 },
    { currency: "eur" },
    { id: "cs_other" },
    { metadata: { ...session.metadata, proposalId: "another" } },
  ]) {
    assert.throws(() =>
      assertSessionMatchesPayment(
        { ...session, ...changed } as Stripe.Checkout.Session,
        payment,
      ),
    );
  }
});
test("signed PDF and separate certificate render frozen source with Unicode signer evidence", async () => {
  const snapshot =
    "Approved example source for automated rendering verification.\nCoverage: eight hours.\n" +
    "A long source paragraph. ".repeat(600);
  const record = {
    method: "typed",
    signature: "Zoë García",
    signed_at: "2026-09-16T12:00:00Z",
    consent_version: CONSENT_VERSION,
    ip: "192.0.2.1",
    user_agent: "Test browser",
  };
  const rendered = await renderSignedDocuments({
    proposalId: "test-proposal",
    bookingId: "test-booking",
    version: 1,
    snapshot,
    snapshotHash: snapshotHash(snapshot),
    signatures: [
      {
        ...record,
        legal_name: "Nicole Dodge",
        email: "nikki@example.test",
        role: "admin",
      },
      {
        ...record,
        legal_name: "Zoë García",
        email: "client@example.test",
        role: "client",
      },
    ],
    auditEvents: [],
  });
  assert.equal(
    createHash("sha256").update(rendered.contract).digest("hex"),
    rendered.contractHash,
  );
  const contract = await PDFDocument.load(rendered.contract);
  const certificate = await PDFDocument.load(rendered.certificate);
  assert.ok(contract.getPageCount() > 1);
  assert.equal(
    certificate.getTitle(),
    "Electronic signature completion certificate",
  );
  assert.equal(rendered.contractHash.length, 64);
  assert.notDeepEqual(rendered.contract, rendered.certificate);
});

test("signer access follows stable account ID after an email change", () => {
  const signer = {
    user_id: "original-account",
    email: "old@example.test",
    role: "client",
  };
  assert.equal(
    isAssignedSigner(signer, {
      id: "original-account",
      name: "Client",
      email: "new@example.test",
      role: "client",
      emailVerified: true,
    }),
    true,
  );
  assert.equal(
    isAssignedSigner(signer, {
      id: "another-account",
      name: "Client",
      email: "old@example.test",
      role: "client",
      emailVerified: true,
    }),
    false,
  );
  assert.equal(
    isAssignedSigner(
      { ...signer, user_id: null },
      {
        id: "invited-account",
        name: "Client",
        email: "old@example.test",
        role: "client",
        emailVerified: false,
      },
    ),
    false,
  );
});
