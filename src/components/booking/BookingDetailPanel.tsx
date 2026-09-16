import { useState } from "react";
import type { BookingDetail } from "../../shared/booking";
import { useBooking } from "./BookingContext";
import { money, readableDate } from "./api";
import SignatureForm from "./SignatureForm";
import PaymentPanel from "./PaymentPanel";
import { EmailVerification } from "../../pages/ClientSettings";

export const bookingStatusLabels: Record<string, string> = {
  requested: "Request received",
  proposed: "Proposal ready",
  confirmed: "Booking confirmed",
  expired: "Hold expired",
  cancelled: "Cancelled",
  draft: "Draft proposal",
  sent: "Awaiting signatures",
  signed: "Agreement signed",
  superseded: "Replaced by a newer proposal",
};
export default function BookingDetailPanel({
  detail,
  onRefresh,
  admin = false,
}: {
  detail: BookingDetail;
  onRefresh: () => Promise<void>;
  admin?: boolean;
}) {
  const { user } = useBooking();
  const { booking, proposal, signers, contractText } = detail;
  const [showContract, setShowContract] = useState(true);
  const [documentPending, setDocumentPending] = useState("");
  const [documentError, setDocumentError] = useState("");
  const allSigned =
    signers.length > 0 && signers.every((person) => Boolean(person.signedAt));
  const downloadDocument = async (kind: "pdf" | "certificate") => {
    if (!proposal) return;
    setDocumentPending(kind);
    setDocumentError("");
    try {
      const response = await fetch(
        `/api/booking/contracts/${encodeURIComponent(proposal.id)}/${kind}`,
        { credentials: "same-origin" },
      );
      if (response.status === 409) {
        setDocumentError(
          "Your signed documents are being prepared. Please try again in a moment.",
        );
        return;
      }
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("application/pdf")
      ) {
        setDocumentError(
          "We couldn’t download this document. Please try again or contact Nikki.",
        );
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${kind === "pdf" ? "photography-agreement" : "signature-certificate"}-${proposal.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setDocumentError(
        "We couldn’t download this document. Check your connection and try again.",
      );
    } finally {
      setDocumentPending("");
    }
  };
  const signer = signers.find(
    (person) =>
      person.userId === user?.id ||
      (person.email.toLowerCase() === user?.email.toLowerCase() &&
        person.role === user.role),
  );
  const expired =
    proposal &&
    (proposal.status === "expired" ||
      (proposal.status !== "confirmed" &&
        Date.parse(proposal.holdExpiresAt) <= Date.now()));
  const canSign =
    proposal &&
    signer &&
    !signer.signedAt &&
    !expired &&
    proposal.status !== "superseded" &&
    booking.status !== "cancelled" &&
    (admin ? proposal.status === "draft" : proposal.status === "sent");
  return (
    <>
      <header className="booking-detail-heading">
        <p className="eyebrow">
          {booking.packageId === "wedding"
            ? "Wedding photography"
            : "Your photography session"}
        </p>
        <h1>{booking.name}’s story.</h1>
        <p className="booking-status">
          {bookingStatusLabels[booking.status] || booking.status}
        </p>
      </header>
      <dl className="booking-facts">
        <div>
          <dt>Date</dt>
          <dd>{readableDate(booking.eventDate)}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{booking.location}</dd>
        </div>
        <div>
          <dt>Contact</dt>
          <dd>
            {booking.email || user?.email}
            <br />
            {booking.telephone}
          </dd>
        </div>
      </dl>
      <section className="booking-panel">
        <h2>Your plans.</h2>
        <p className="booking-preserve-lines">{booking.message}</p>
      </section>
      {!proposal ? (
        <section className="booking-panel">
          <p className="eyebrow">What happens next</p>
          <h2>We’ll work out the details.</h2>
          <p>
            {admin
              ? "Review the request and prepare a proposal below."
              : "Nikki will review your date and plans. Your personal proposal will appear here when it’s ready."}
          </p>
          <p className="booking-small">
            Submitting a request does not reserve a date.
          </p>
        </section>
      ) : (
        <>
          <section className="booking-panel">
            <div className="booking-section-top">
              <div>
                <p className="eyebrow">Proposal · Version {proposal.version}</p>
                <h2>Your collection.</h2>
              </div>
              <span className="booking-status">
                {bookingStatusLabels[proposal.status] || proposal.status}
              </span>
            </div>
            <p className="booking-preserve-lines">{proposal.coverage}</p>
            <dl className="booking-facts">
              <div>
                <dt>Total</dt>
                <dd>{money(proposal.totalCents)}</dd>
              </div>
              <div>
                <dt>Retainer</dt>
                <dd>{money(proposal.retainerCents)}</dd>
              </div>
              <div>
                <dt>Proposal hold expires (Denver)</dt>
                <dd>
                  {readableDate(proposal.holdExpiresAt)}
                  <br />
                  <small>
                    {new Date(proposal.holdExpiresAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZoneName: "short",
                      timeZone: "America/Denver",
                    })}
                  </small>
                </dd>
              </div>
            </dl>
            {expired && (
              <p className="booking-alert">
                This hold has expired. Contact Nikki for an updated proposal.
              </p>
            )}
          </section>
          <section
            className="booking-panel"
            aria-labelledby="booking-contract-title"
          >
            <div className="booking-section-top">
              <div>
                <p className="eyebrow">Your agreement</p>
                <h2 id="booking-contract-title">The details, in writing.</h2>
              </div>
              <button
                className="booking-plain-button"
                aria-expanded={showContract}
                aria-controls="booking-contract-text"
                onClick={() => setShowContract(!showContract)}
              >
                {showContract ? "Collapse agreement" : "Read full agreement"}
              </button>
            </div>
            {showContract && (
              <div
                className="booking-contract-text"
                id="booking-contract-text"
                tabIndex={0}
              >
                {contractText || proposal.contractSnapshot}
              </div>
            )}
            {allSigned ? (
              <div className="booking-actions">
                <button
                  className="text-link booking-document-button"
                  disabled={Boolean(documentPending)}
                  onClick={() => void downloadDocument("pdf")}
                >
                  {documentPending === "pdf"
                    ? "Preparing download…"
                    : "Download signed agreement ↓"}
                </button>
                <button
                  className="text-link booking-document-button"
                  disabled={Boolean(documentPending)}
                  onClick={() => void downloadDocument("certificate")}
                >
                  {documentPending === "certificate"
                    ? "Preparing download…"
                    : "Download signature certificate ↓"}
                </button>
              </div>
            ) : (
              <p className="booking-small">
                Your signed agreement and signature certificate will be
                available to download after everyone has signed.
              </p>
            )}
            {documentError && (
              <p className="booking-alert" role="alert">
                {documentError}
              </p>
            )}
            <h3 className="booking-signers-title">Signatures</h3>
            <ul className="booking-signer-list">
              {signers.map((person) => (
                <li key={person.id}>
                  <span>
                    {person.name}
                    <small>
                      {person.role === "admin" ? "Photographer" : "Client"}
                    </small>
                  </span>
                  <span>
                    {person.signedAt
                      ? `Signed ${readableDate(person.signedAt)}`
                      : "Awaiting signature"}
                  </span>
                </li>
              ))}
            </ul>
            {!user?.emailVerified ? (
              <EmailVerification />
            ) : canSign ? (
              <SignatureForm
                key={proposal.id}
                proposalId={proposal.id}
                initialName={signer?.name || user?.name || ""}
                onSigned={onRefresh}
                isAdmin={admin}
              />
            ) : signer?.signedAt ? (
              <p className="booking-notice">
                Your signature is recorded for this agreement.
              </p>
            ) : !admin && !signer ? (
              <p className="booking-small">
                You are viewing this booking. Only the people named as signers
                can sign this agreement.
              </p>
            ) : null}
          </section>
          {!admin && user?.emailVerified && (
            <PaymentPanel
              key={proposal.id}
              detail={detail}
              onRefresh={onRefresh}
            />
          )}
        </>
      )}
    </>
  );
}
