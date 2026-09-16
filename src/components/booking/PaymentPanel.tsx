import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import type { BookingDetail } from "../../shared/booking";
import { useBooking } from "./BookingContext";
import { bookingPost, errorMessage, money, readableDate } from "./api";

export default function PaymentPanel({
  detail,
  onRefresh,
}: {
  detail: BookingDetail;
  onRefresh: () => Promise<void>;
}) {
  const { status, user } = useBooking();
  const [secret, setSecret] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const stripe = useMemo(
    () =>
      status?.stripePublishableKey
        ? loadStripe(status.stripePublishableKey)
        : null,
    [status?.stripePublishableKey],
  );
  const proposal = detail.proposal;
  if (!proposal) return null;
  const retainerPaid = detail.payments.some(
    (payment) => payment.kind === "retainer" && payment.status === "paid",
  );
  const balancePaid = detail.payments.some(
    (payment) => payment.kind === "balance" && payment.status === "paid",
  );
  const refunded = detail.payments.some(
    (payment) => payment.status === "refunded",
  );
  const processing = detail.payments.some(
    (payment) => payment.status === "pending",
  );
  const fullSigned =
    detail.signers.length > 0 &&
    detail.signers.every((signer) => Boolean(signer.signedAt));
  const expired =
    proposal.status === "expired" ||
    (proposal.status !== "confirmed" &&
      Date.parse(proposal.holdExpiresAt) <= Date.now());
  const kind = retainerPaid ? "balance" : "retainer";
  const amount = retainerPaid
    ? proposal.totalCents - proposal.retainerCents
    : proposal.retainerCents;
  const isClientSigner = detail.signers.some(
    (signer) =>
      signer.role === "client" &&
      (signer.userId === user?.id ||
        signer.email.toLowerCase() === user?.email.toLowerCase()),
  );
  const eligibleStatus =
    kind === "retainer"
      ? proposal.status === "signed"
      : proposal.status === "confirmed";
  const canPay =
    isClientSigner &&
    fullSigned &&
    !refunded &&
    !expired &&
    eligibleStatus &&
    !balancePaid &&
    amount > 0;
  const checkout = async () => {
    setPending(true);
    setError("");
    try {
      const result = await bookingPost<{
        clientSecret: string | null;
        status?: string;
      }>(`/api/booking/proposals/${encodeURIComponent(proposal.id)}/checkout`, {
        kind,
      });
      if (result.status === "paid") {
        await onRefresh();
        return;
      }
      if (!result.clientSecret)
        throw new Error(
          "The payment form could not be opened. Please try again.",
        );
      setSecret(result.clientSecret);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  };
  const completed = () => {
    setSecret("");
    setSubmitted(true);
    void onRefresh();
  };
  return (
    <section
      className="booking-panel"
      aria-labelledby="booking-payment-heading"
    >
      <p className="eyebrow">Payments</p>
      <h2 id="booking-payment-heading">Your investment.</h2>
      <dl className="booking-amounts">
        <div>
          <dt>Collection total</dt>
          <dd>{money(proposal.totalCents)}</dd>
        </div>
        <div>
          <dt>Retainer {retainerPaid ? "· paid" : "· due after signing"}</dt>
          <dd>{money(proposal.retainerCents)}</dd>
        </div>
        <div>
          <dt>
            Balance{" "}
            {balancePaid
              ? "· paid"
              : `· due ${readableDate(proposal.balanceDueDate)}`}
          </dt>
          <dd>{money(proposal.totalCents - proposal.retainerCents)}</dd>
        </div>
      </dl>
      {detail.payments
        .filter((p) => p.status === "refunded")
        .map((p) => (
          <p key={p.id}>
            Refund recorded: {money(p.amountCents)} ({p.kind}). Contact Nikki
            about the current balance.
          </p>
        ))}
      {submitted || processing ? (
        <div className="booking-notice" role="status">
          <p>
            {submitted
              ? "Your payment was submitted. We’re waiting for confirmation."
              : "A payment has been started but is not confirmed yet."}{" "}
            This page shows a paid status only after confirmation reaches us.
          </p>
          <button
            className="booking-plain-button"
            onClick={() => void onRefresh()}
          >
            Refresh payment status
          </button>
        </div>
      ) : null}
      {balancePaid || (retainerPaid && amount === 0) ? (
        <p className="booking-notice">All payments are complete. Thank you.</p>
      ) : !isClientSigner ? (
        <p>Payments are available to the clients named on this agreement.</p>
      ) : refunded ? (
        <p>
          A refund is recorded on this proposal. Contact Nikki to review any
          remaining payment.
        </p>
      ) : !fullSigned ? (
        <p>Payment opens once everyone has signed the agreement.</p>
      ) : expired ? (
        <p>
          This proposal’s hold has expired. Contact Nikki to confirm
          availability before paying.
        </p>
      ) : !stripe ? (
        <p>
          Online payment is currently unavailable. Please contact Nikki for help
          with your payment.
        </p>
      ) : canPay && !secret ? (
        <button
          className="button"
          disabled={pending || (submitted && processing)}
          onClick={() => void checkout()}
        >
          {pending
            ? "Opening secure payment…"
            : `Pay ${kind} · ${money(amount)}`}
        </button>
      ) : null}
      {error && (
        <p className="booking-alert" role="alert">
          {error}
        </p>
      )}
      {secret && stripe && (
        <div className="booking-checkout">
          <EmbeddedCheckoutProvider
            stripe={stripe}
            options={{ clientSecret: secret, onComplete: completed }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      )}
      {detail.payments.length > 0 && (
        <div className="booking-payment-history">
          <table>
            <caption>Payment history</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Payment</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {detail.payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{readableDate(payment.createdAt)}</td>
                  <td>
                    {payment.kind === "retainer" ? "Retainer" : "Balance"}
                  </td>
                  <td>{money(payment.amountCents)}</td>
                  <td>
                    {payment.status.charAt(0).toUpperCase() +
                      payment.status.slice(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="booking-small">
        Secure payment provided by Stripe. Your date is confirmed after all
        required signatures and the retainer payment are confirmed.
      </p>
    </section>
  );
}
