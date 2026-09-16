import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import type { PoolClient } from "pg";
import { pool, withTransaction } from "./db.js";
import {
  appendAudit,
  assertFrozenContract,
  BookingError,
  portalUrl,
  requireVerifiedActor,
  type BookingActor,
} from "./signing.js";

export type PaymentKind = "retainer" | "balance";
interface PaymentRow {
  id: string;
  proposal_id: string;
  kind: PaymentKind;
  amount_cents: number;
  status: string;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  checkout_expires_at: Date | null;
  checkout_url: string | null;
  checkout_params: Stripe.Checkout.SessionCreateParams | null;
}
interface ProposalRow {
  id: string;
  booking_id: string;
  status: string;
  hold_expires_at: Date;
  total_cents: number;
  retainer_cents: number;
  balance_due_date: string;
  contract_snapshot: string;
  contract_hash: string;
}
function stripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new BookingError("Online payments are not configured yet.", 503);
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    maxNetworkRetries: 2,
    timeout: 20_000,
  });
}
export function getPaymentReadiness() {
  const secretKey = Boolean(process.env.STRIPE_SECRET_KEY);
  const webhook = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  let returnUrl = false;
  try {
    returnUrl = Boolean(process.env.PUBLIC_APP_URL && portalUrl("readiness"));
  } catch {
    /* reported below */
  }
  return {
    ready: Boolean(pool) && secretKey && webhook && returnUrl,
    secretKey,
    webhook,
    returnUrl,
  };
}
export function checkoutExpiry(
  kind: PaymentKind,
  holdExpiresAt: Date | string,
  now = Date.now(),
): number {
  const maximum = Math.floor(now / 1000) + 23 * 60 * 60;
  const expiry =
    kind === "retainer"
      ? Math.min(maximum, Math.floor(new Date(holdExpiresAt).getTime() / 1000))
      : maximum;
  // Stripe requires at least 30 minutes; allow a minute for request latency.
  if (!Number.isFinite(expiry) || expiry < Math.floor(now / 1000) + 31 * 60) {
    throw new BookingError(
      "The date hold is nearly over. Ask Nikki to renew it before paying.",
      409,
    );
  }
  return expiry;
}
export function assertSessionMatchesPayment(
  session: Stripe.Checkout.Session,
  payment: Pick<
    PaymentRow,
    "id" | "proposal_id" | "kind" | "amount_cents" | "stripe_session_id"
  >,
): void {
  if (
    session.mode !== "payment" ||
    session.currency !== "usd" ||
    session.amount_total !== payment.amount_cents ||
    session.metadata?.paymentId !== payment.id ||
    session.metadata?.proposalId !== payment.proposal_id ||
    session.metadata?.kind !== payment.kind ||
    session.client_reference_id !== payment.id ||
    (payment.stripe_session_id && session.id !== payment.stripe_session_id)
  ) {
    throw new BookingError("The payment does not match this proposal.", 409);
  }
}
async function sessionForPayment(
  stripe: Stripe,
  payment: PaymentRow,
): Promise<Stripe.Checkout.Session> {
  if (payment.stripe_session_id)
    return stripe.checkout.sessions.retrieve(payment.stripe_session_id);
  if (!payment.checkout_params)
    throw new BookingError(
      "Payment reconciliation requires staff review.",
      503,
    );
  // Persisted arguments + payment UUID survive a timeout after Stripe creates a session.
  return stripe.checkout.sessions.create(payment.checkout_params, {
    idempotencyKey: `booking-checkout-${payment.id}`,
  });
}

export async function createCheckout(
  user: BookingActor,
  proposalId: string,
  kind: PaymentKind,
) {
  requireVerifiedActor(user);
  if (!getPaymentReadiness().ready)
    throw new BookingError("Online payments are not configured yet.", 503);
  if (kind !== "retainer" && kind !== "balance")
    throw new BookingError("Choose retainer or balance.");
  const payment = await withTransaction(async (client) => {
    const proposal = (
      await client.query<ProposalRow>(
        "SELECT * FROM proposals WHERE id=$1 FOR UPDATE",
        [proposalId],
      )
    ).rows[0];
    if (!proposal) throw new BookingError("Proposal not found.", 404);
    const signer = await client.query(
      `SELECT id FROM proposal_signers WHERE proposal_id=$1 AND role='client' AND user_id=$2`,
      [proposalId, user.id],
    );
    if (!signer.rowCount)
      throw new BookingError(
        "This proposal belongs to a different client.",
        403,
      );
    assertFrozenContract(proposal.contract_snapshot, proposal.contract_hash);
    const unsigned = await client.query(
      "SELECT id FROM proposal_signers WHERE proposal_id=$1 AND signed_at IS NULL",
      [proposalId],
    );
    if (unsigned.rowCount)
      throw new BookingError(
        "Every signer must finish the contract before payment.",
        409,
      );
    const payments = (
      await client.query<PaymentRow>(
        "SELECT * FROM payments WHERE proposal_id=$1 FOR UPDATE",
        [proposalId],
      )
    ).rows;
    if (
      payments.some(
        (row) => row.kind === kind && ["paid", "refunded"].includes(row.status),
      )
    )
      throw new BookingError("This payment has already been recorded.", 409);
    if (kind === "retainer") {
      if (
        proposal.status !== "signed" ||
        new Date(proposal.hold_expires_at).getTime() <= Date.now()
      )
        throw new BookingError(
          "A signed proposal with an active date hold is required.",
          409,
        );
      const hold = await client.query(
        `SELECT id FROM reservations WHERE proposal_id=$1 AND status='held' FOR UPDATE`,
        [proposalId],
      );
      if (!hold.rowCount)
        throw new BookingError("This date is not currently held.", 409);
    } else if (
      proposal.status !== "confirmed" ||
      !payments.some((row) => row.kind === "retainer" && row.status === "paid")
    ) {
      throw new BookingError(
        "The retainer must be paid before the remaining balance.",
        409,
      );
    }
    const pending = payments.find(
      (row) => row.kind === kind && row.status === "pending",
    );
    if (pending) return pending;
    const amount =
      kind === "retainer"
        ? proposal.retainer_cents
        : proposal.total_cents - proposal.retainer_cents;
    if (!Number.isSafeInteger(amount) || amount <= 0)
      throw new BookingError(
        "There is no outstanding amount for this payment.",
        409,
      );
    const id = randomUUID();
    const expires = checkoutExpiry(kind, proposal.hold_expires_at);
    const url = portalUrl(proposal.booking_id);
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      ui_mode: "embedded_page",
      payment_method_types: ["card"],
      client_reference_id: id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amount,
            product_data: {
              name: `Nikki Dodge Photography — ${kind === "retainer" ? "reservation retainer" : "remaining balance"}`,
            },
          },
        },
      ],
      metadata: { paymentId: id, proposalId, kind },
      payment_intent_data: { metadata: { paymentId: id, proposalId, kind } },
      expires_at: expires,
      return_url: `${url}?payment=processing`,
    };
    return (
      await client.query<PaymentRow>(
        `INSERT INTO payments (id,proposal_id,kind,amount_cents,status,checkout_expires_at,checkout_params)
            VALUES ($1,$2,$3,$4,'pending',$5,$6::jsonb) RETURNING *`,
        [
          id,
          proposalId,
          kind,
          amount,
          new Date(expires * 1000),
          JSON.stringify(params),
        ],
      )
    ).rows[0];
  });
  const stripe = stripeClient();
  const session = await sessionForPayment(stripe, payment);
  assertSessionMatchesPayment(session, payment);
  await withTransaction(async (client) => {
    const proposal = (
      await client.query<ProposalRow>(
        "SELECT * FROM proposals WHERE id=$1 FOR UPDATE",
        [proposalId],
      )
    ).rows[0];
    await client.query(
      `UPDATE payments SET stripe_session_id=$1,checkout_url=$2,updated_at=NOW() WHERE id=$3`,
      [session.id, session.url, payment.id],
    );
    if (session.payment_status === "paid")
      await applyPaidSession(client, proposal, payment, session);
    else if (session.status === "expired")
      await client.query(
        `UPDATE payments SET status='expired',updated_at=NOW() WHERE id=$1 AND status='pending'`,
        [payment.id],
      );
  });
  if (session.payment_status === "paid")
    return { status: "paid", clientSecret: null };
  if (session.status !== "open" || !session.client_secret)
    throw new BookingError(
      "This checkout has closed. Refresh the proposal to continue.",
      409,
    );
  return { status: "pending", clientSecret: session.client_secret };
}

async function queueEmail(
  client: PoolClient,
  proposalId: string,
  subject: string,
  text: string,
  notBefore?: Date,
) {
  const recipients = (
    await client.query(
      `SELECT email FROM proposal_signers WHERE proposal_id=$1 AND role='client'`,
      [proposalId],
    )
  ).rows;
  for (const recipient of recipients)
    await client.query(
      `INSERT INTO notification_jobs (id,kind,recipient,payload,next_attempt_at)
        VALUES ($1,'email',$2,$3::jsonb,$4)`,
      [
        randomUUID(),
        recipient.email,
        JSON.stringify({ proposalId, subject, text }),
        notBefore || new Date(),
      ],
    );
}
async function applyPaidSession(
  client: PoolClient,
  proposal: ProposalRow,
  payment: PaymentRow,
  session: Stripe.Checkout.Session,
) {
  assertSessionMatchesPayment(session, payment);
  if (session.payment_status !== "paid") return;
  const current = (
    await client.query<PaymentRow>(
      "SELECT * FROM payments WHERE id=$1 FOR UPDATE",
      [payment.id],
    )
  ).rows[0];
  if (current.status === "paid" || current.status === "refunded") return;
  const intent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  await client.query(
    `UPDATE payments SET status='paid',stripe_session_id=$1,stripe_payment_intent=$2,updated_at=NOW() WHERE id=$3`,
    [session.id, intent || null, payment.id],
  );
  let confirmed = false;
  if (payment.kind === "retainer") {
    const unsigned = await client.query(
      "SELECT id FROM proposal_signers WHERE proposal_id=$1 AND signed_at IS NULL",
      [proposal.id],
    );
    const reservation = (
      await client.query(
        "SELECT * FROM reservations WHERE proposal_id=$1 FOR UPDATE",
        [proposal.id],
      )
    ).rows[0];
    if (
      !unsigned.rowCount &&
      ["signed", "confirmed"].includes(proposal.status) &&
      reservation &&
      ["held", "confirmed"].includes(reservation.status)
    ) {
      await client.query(
        `UPDATE reservations SET status='confirmed' WHERE proposal_id=$1`,
        [proposal.id],
      );
      await client.query(
        `UPDATE proposals SET status='confirmed' WHERE id=$1`,
        [proposal.id],
      );
      await client.query(
        `UPDATE booking_requests SET status='confirmed',updated_at=NOW() WHERE id=$1`,
        [proposal.booking_id],
      );
      confirmed = true;
      await queueEmail(
        client,
        proposal.id,
        "Your photography date is confirmed",
        `Your contract is signed and the retainer has been received. Your date with Nikki Dodge Photography is confirmed.\n\n${portalUrl(proposal.booking_id)}`,
      );
      const balance = proposal.total_cents - proposal.retainer_cents;
      if (balance > 0)
        for (const days of [7, 1]) {
          const when = new Date(`${proposal.balance_due_date}T16:00:00.000Z`);
          when.setUTCDate(when.getUTCDate() - days);
          if (when.getTime() > Date.now())
            await queueEmail(
              client,
              proposal.id,
              "Your photography balance is coming due",
              `Your remaining balance of $${(balance / 100).toFixed(2)} is due ${proposal.balance_due_date}. Review your proposal and pay securely here:\n\n${portalUrl(proposal.booking_id)}`,
              when,
            );
        }
    } else {
      // Never quietly take another client's date after a late/out-of-order event.
      await client.query(
        `INSERT INTO notification_jobs (id,kind,recipient,payload) VALUES ($1,'email',$2,$3::jsonb)`,
        [
          randomUUID(),
          process.env.BOOKING_NOTIFICATION_EMAIL || process.env.SMTP_FROM || "",
          JSON.stringify({
            proposalId: proposal.id,
            subject: "Payment needs reservation review",
            text: `Payment ${payment.id} was received, but the date could not be automatically confirmed. Review proposal ${proposal.id} and arrange a resolution with the client.`,
          }),
        ],
      );
    }
  } else {
    await queueEmail(
      client,
      proposal.id,
      "Your photography balance payment was received",
      `Your balance payment has been received. Thank you.\n\n${portalUrl(proposal.booking_id)}`,
    );
  }
  await appendAudit(client, {
    bookingId: proposal.booking_id,
    proposalId: proposal.id,
    type: "payment_received",
    details: {
      paymentId: payment.id,
      kind: payment.kind,
      amountCents: payment.amount_cents,
      stripeSessionId: session.id,
      confirmed,
    },
  });
}

export async function handleStripeWebhook(rawBody: Buffer, signature: string) {
  if (!process.env.STRIPE_WEBHOOK_SECRET)
    throw new BookingError("Payment webhooks are not configured.", 503);
  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    throw new BookingError("Invalid payment webhook signature.", 400);
  }
  return withTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO stripe_events (id,status) VALUES ($1,'processing') ON CONFLICT DO NOTHING RETURNING id`,
      [event.id],
    );
    if (!inserted.rowCount) return { received: true, duplicate: true };
    if (
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.expired",
        "checkout.session.async_payment_failed",
      ].includes(event.type)
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId;
      if (
        paymentId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          paymentId,
        )
      ) {
        const payment = (
          await client.query<PaymentRow>("SELECT * FROM payments WHERE id=$1", [
            paymentId,
          ])
        ).rows[0];
        if (payment) {
          const proposal = (
            await client.query<ProposalRow>(
              "SELECT * FROM proposals WHERE id=$1 FOR UPDATE",
              [payment.proposal_id],
            )
          ).rows[0];
          assertSessionMatchesPayment(session, payment);
          await client.query(
            "UPDATE payments SET stripe_session_id=$1,updated_at=NOW() WHERE id=$2",
            [session.id, payment.id],
          );
          if (session.payment_status === "paid")
            await applyPaidSession(client, proposal, payment, session);
          else if (
            event.type === "checkout.session.expired" ||
            event.type === "checkout.session.async_payment_failed"
          ) {
            await client.query(
              `UPDATE payments SET status=$1,updated_at=NOW() WHERE id=$2 AND status='pending'`,
              [
                event.type.endsWith("expired") ? "expired" : "failed",
                payment.id,
              ],
            );
          }
        }
      }
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const intent =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (intent) {
        const metadataId = charge.metadata?.paymentId;
        const safeId =
          metadataId &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            metadataId,
          )
            ? metadataId
            : null;
        const payment = (
          await client.query<PaymentRow>(
            "SELECT * FROM payments WHERE stripe_payment_intent=$1 OR id=$2",
            [intent, safeId],
          )
        ).rows[0];
        if (payment) {
          const proposal = (
            await client.query<ProposalRow>(
              "SELECT * FROM proposals WHERE id=$1 FOR UPDATE",
              [payment.proposal_id],
            )
          ).rows[0];
          if (
            charge.currency !== "usd" ||
            charge.amount !== payment.amount_cents ||
            (payment.stripe_payment_intent &&
              payment.stripe_payment_intent !== intent)
          )
            throw new BookingError(
              "The refund does not match this payment.",
              409,
            );
          if (charge.refunded)
            await client.query(
              `UPDATE payments SET status='refunded',stripe_payment_intent=$2,updated_at=NOW() WHERE id=$1`,
              [payment.id, intent],
            );
          await appendAudit(client, {
            bookingId: proposal.booking_id,
            proposalId: proposal.id,
            type: "payment_refunded",
            details: {
              paymentId: payment.id,
              amountRefunded: charge.amount_refunded,
              fullRefund: charge.refunded,
            },
          });
          // A refund does not automatically cancel a signed contract or release its date.
        }
      }
    }
    await client.query(
      `UPDATE stripe_events SET status='processed' WHERE id=$1`,
      [event.id],
    );
    return { received: true, duplicate: false };
  });
}

let expiryCursor = "";
export async function reconcileExpiredHolds(): Promise<void> {
  if (!pool) return;
  let expired = (
    await pool.query(
      `SELECT id FROM proposals WHERE status IN ('draft','sent','signed') AND hold_expires_at<=NOW()
        AND id::text>$1 ORDER BY id LIMIT 25`,
      [expiryCursor],
    )
  ).rows;
  if (!expired.length && expiryCursor) {
    expiryCursor = "";
    expired = (
      await pool.query(
        `SELECT id FROM proposals WHERE status IN ('draft','sent','signed') AND hold_expires_at<=NOW() ORDER BY id LIMIT 25`,
      )
    ).rows;
  }
  for (const row of expired) {
    expiryCursor = row.id;
    try {
      await withTransaction(async (client) => {
        const proposal = (
          await client.query<ProposalRow>(
            "SELECT * FROM proposals WHERE id=$1 FOR UPDATE",
            [row.id],
          )
        ).rows[0];
        if (
          !["draft", "sent", "signed"].includes(proposal.status) ||
          new Date(proposal.hold_expires_at).getTime() > Date.now()
        )
          return;
        const pending = (
          await client.query<PaymentRow>(
            `SELECT * FROM payments WHERE proposal_id=$1 AND status='pending'`,
            [proposal.id],
          )
        ).rows;
        for (const payment of pending) {
          const stripe = stripeClient();
          let session = await sessionForPayment(stripe, payment);
          assertSessionMatchesPayment(session, payment);
          if (session.status === "open") {
            try {
              session = await stripe.checkout.sessions.expire(session.id);
            } catch {
              session = await stripe.checkout.sessions.retrieve(session.id);
            }
          }
          await client.query(
            "UPDATE payments SET stripe_session_id=$1,updated_at=NOW() WHERE id=$2",
            [session.id, payment.id],
          );
          if (session.payment_status === "paid") {
            await applyPaidSession(client, proposal, payment, session);
            return;
          }
          if (session.status !== "expired") return; // unresolved payment: keep its date reserved
          await client.query(
            `UPDATE payments SET status='expired',updated_at=NOW() WHERE id=$1 AND status='pending'`,
            [payment.id],
          );
        }
        if (
          (
            await client.query(
              `SELECT id FROM payments WHERE proposal_id=$1 AND kind='retainer' AND status='paid'`,
              [proposal.id],
            )
          ).rowCount
        )
          return;
        await client.query(
          `UPDATE reservations SET status='released' WHERE proposal_id=$1 AND status='held'`,
          [proposal.id],
        );
        await client.query(
          `UPDATE proposals SET status='expired' WHERE id=$1`,
          [proposal.id],
        );
        await client.query(
          `UPDATE booking_requests SET status='expired',updated_at=NOW() WHERE id=$1`,
          [proposal.booking_id],
        );
        await appendAudit(client, {
          bookingId: proposal.booking_id,
          proposalId: proposal.id,
          type: "hold_expired",
          details: {},
        });
      });
    } catch {
      console.error(
        `[booking] Date hold ${row.id} retained because payment reconciliation failed.`,
      );
    }
  }
}
