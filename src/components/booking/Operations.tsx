import { useCallback, useEffect, useState } from "react";
import {
  bookingApi,
  bookingPost,
  errorMessage,
  readableDate,
  providerName,
} from "./api";

interface SystemStatus {
  intakeEnabled: boolean;
  providers: string[];
  documents: { ready: boolean };
  payments: { ready: boolean };
  email: { ready: boolean };
  failedJobs: number;
  queuedJobs: number;
  overdueHolds: number;
  paymentReviews: Array<{ id: string; bookingId: string; name: string }>;
}
interface DeliveryJob {
  id: string;
  kind: string;
  recipient: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

export default function Operations({
  onOpenBooking,
}: {
  onOpenBooking: (id: string) => void;
}) {
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [jobs, setJobs] = useState<DeliveryJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const [nextSystem, nextJobs] = await Promise.all([
        bookingApi<SystemStatus>("/api/booking/admin/system"),
        bookingApi<DeliveryJob[]>("/api/booking/admin/jobs"),
      ]);
      setSystem(nextSystem);
      setJobs(nextJobs);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const retry = async (id: string) => {
    setPending(id);
    setNotice("");
    setError("");
    try {
      await bookingPost(
        `/api/booking/admin/jobs/${encodeURIComponent(id)}/retry`,
      );
      await load();
      setNotice("Retry queued. Check back to confirm delivery.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending("");
    }
  };
  if (loading) return <p role="status">Checking booking operations…</p>;
  return (
    <section className="booking-operations">
      <p className="eyebrow">Operations</p>
      <h2>Keep an eye on the details.</h2>
      {error && (
        <p className="booking-alert" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="booking-notice" role="status">
          {notice}
        </p>
      )}
      {!system ? (
        <button className="button" onClick={() => void load()}>
          Try again
        </button>
      ) : (
        <>
          <section className="booking-panel">
            <h3>Service configuration</h3>
            <dl className="booking-readiness">
              <div>
                <dt>New booking requests</dt>
                <dd>{system.intakeEnabled ? "Open" : "Paused"}</dd>
              </div>
              <div>
                <dt>Social sign in</dt>
                <dd>
                  {system.providers.length
                    ? system.providers.map(providerName).join(", ")
                    : "Needs setup"}
                </dd>
              </div>
              <div>
                <dt>Private contract documents</dt>
                <dd>{system.documents.ready ? "Configured" : "Needs setup"}</dd>
              </div>
              <div>
                <dt>Online payments</dt>
                <dd>{system.payments.ready ? "Configured" : "Needs setup"}</dd>
              </div>
              <div>
                <dt>Email delivery</dt>
                <dd>{system.email.ready ? "Configured" : "Needs setup"}</dd>
              </div>
            </dl>
          </section>
          <section className="booking-panel">
            <h3>Needs attention</h3>
            <dl className="booking-facts">
              <div>
                <dt>Failed deliveries</dt>
                <dd>{system.failedJobs}</dd>
              </div>
              <div>
                <dt>Queued deliveries</dt>
                <dd>{system.queuedJobs}</dd>
              </div>
              <div>
                <dt>Expired holds awaiting payment checks</dt>
                <dd>{system.overdueHolds}</dd>
              </div>
            </dl>
            {system.overdueHolds > 0 && (
              <p>
                These holds are waiting for payment reconciliation. Check
                payment setup and refresh before making the dates available.
              </p>
            )}
            {system.paymentReviews.length > 0 ? (
              <div className="booking-payment-reviews">
                <p>
                  Review these payments in Stripe and contact the client before
                  deciding what to do next. No refund is initiated here.
                </p>
                {system.paymentReviews.map((review) => (
                  <div key={review.id}>
                    <strong>{review.name}</strong>
                    <button
                      className="button button--outline"
                      onClick={() => onOpenBooking(review.bookingId)}
                    >
                      Open booking
                    </button>
                  </div>
                ))}
                <a
                  className="text-link"
                  href="https://dashboard.stripe.com/payments"
                  target="_blank"
                  rel="noreferrer"
                >
                  Review payments in Stripe ↗
                </a>
              </div>
            ) : (
              <p>No payments are currently flagged for review.</p>
            )}
          </section>
          <section className="booking-panel">
            <h3>Delivery queue</h3>
            <p>
              Failed items can be retried after the underlying issue is
              resolved. Queued items will be processed automatically.
            </p>
            {jobs.filter((job) =>
              ["pending", "processing", "failed"].includes(job.status),
            ).length === 0 ? (
              <p>No pending or failed deliveries.</p>
            ) : (
              <div className="booking-jobs">
                {jobs
                  .filter((job) =>
                    ["pending", "processing", "failed"].includes(job.status),
                  )
                  .map((job) => (
                    <article key={job.id}>
                      <div>
                        <p className="eyebrow">
                          {job.kind === "email"
                            ? "Email"
                            : job.kind === "documents"
                              ? "Contract documents"
                              : job.kind.replace(/_/g, " ")}{" "}
                          ·{" "}
                          {job.status === "failed"
                            ? "Failed"
                            : job.status === "processing"
                              ? "Processing"
                              : "Queued"}
                        </p>
                        <h4>{job.recipient || "Private booking documents"}</h4>
                        <p className="booking-small">
                          Created {readableDate(job.createdAt)} · {job.attempts}{" "}
                          attempt{job.attempts === 1 ? "" : "s"}
                        </p>
                        {job.lastError && (
                          <p className="booking-job-error">{job.lastError}</p>
                        )}
                      </div>
                      {job.status === "failed" && (
                        <button
                          className="button button--outline"
                          disabled={Boolean(pending)}
                          onClick={() => void retry(job.id)}
                        >
                          {pending === job.id ? "Queueing…" : "Retry delivery"}
                        </button>
                      )}
                    </article>
                  ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
