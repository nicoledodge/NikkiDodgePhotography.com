import { DateTime } from "luxon";
import Operations from "./Operations";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type {
  BookingDetail,
  BookingRequest,
  ContractTemplate,
} from "../../shared/booking";
import { bookingApi, bookingPost, errorMessage, readableDate } from "./api";
import BookingDetailPanel, { bookingStatusLabels } from "./BookingDetailPanel";

function ProposalForm({
  detail,
  templates,
  onCreated,
}: {
  detail: BookingDetail;
  templates: ContractTemplate[];
  onCreated: () => Promise<void>;
}) {
  const current = detail.proposal;
  const [coverage, setCoverage] = useState(current?.coverage || "");
  const [total, setTotal] = useState(
    current ? String(current.totalCents / 100) : "",
  );
  const [retainer, setRetainer] = useState(
    current ? String(current.retainerCents / 100) : "",
  );
  const [balanceDueDate, setBalanceDueDate] = useState(
    current?.balanceDueDate?.slice(0, 10) || "",
  );
  const [holdExpiresAt, setHoldExpiresAt] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id || "");
  const [signers, setSigners] = useState([
    { name: detail.booking.name, email: detail.booking.email || "" },
  ]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(!current);
  const selected = templates.find((template) => template.id === templateId);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const totalCents = Math.round(Number(total) * 100);
    const retainerCents = Math.round(Number(retainer) * 100);
    if (
      !Number.isSafeInteger(totalCents) ||
      !Number.isSafeInteger(retainerCents) ||
      totalCents <= 0 ||
      retainerCents <= 0 ||
      retainerCents > totalCents
    ) {
      setError(
        "Enter a positive total and a retainer no greater than the total.",
      );
      return;
    }
    if (
      new Set(signers.map((person) => person.email.trim().toLowerCase()))
        .size !== signers.length
    ) {
      setError("Each signer must have a different email address.");
      return;
    }
    if (!selected) {
      setError("Choose an approved contract template first.");
      return;
    }
    const holdDate = DateTime.fromISO(holdExpiresAt, {
      zone: "America/Denver",
    });
    if (
      !holdDate.isValid ||
      holdDate.toFormat("yyyy-MM-dd'T'HH:mm") !== holdExpiresAt
    ) {
      setError(
        "Choose a valid date and time in Denver. This time may fall in a daylight saving change.",
      );
      return;
    }
    if (holdDate.toMillis() <= Date.now()) {
      setError("The proposal hold must expire in the future.");
      return;
    }
    setPending(true);
    try {
      await bookingPost(
        `/api/booking/admin/bookings/${encodeURIComponent(detail.booking.id)}/proposals`,
        {
          coverage,
          totalCents,
          retainerCents,
          balanceDueDate,
          holdExpiresAt: holdDate.toUTC().toISO(),
          signers,
          contractTemplateId: templateId,
        },
      );
      await onCreated();
      setRevision(false);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  };
  if (
    detail.booking.status === "confirmed" ||
    detail.booking.status === "cancelled"
  )
    return null;
  if (!revision)
    return (
      <section className="booking-panel">
        <button
          className="button button--outline"
          onClick={() => setRevision(true)}
        >
          Prepare a revised proposal
        </button>
        <p className="booking-small">
          A new version replaces the current proposal and requires new
          signatures.
        </p>
      </section>
    );
  return (
    <section className="booking-panel">
      <p className="eyebrow">Prepare a proposal</p>
      <h2>Make the offer clear.</h2>
      {templates.length === 0 ? (
        <p>
          Add your approved contract text in Contract templates before preparing
          a proposal.
        </p>
      ) : (
        <form className="booking-form" onSubmit={submit}>
          <label className="booking-full">
            Coverage and deliverables
            <textarea
              required
              rows={5}
              value={coverage}
              onChange={(e) => setCoverage(e.target.value)}
            />
          </label>
          <label>
            Total price (USD)
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </label>
          <label>
            Retainer (USD)
            <input
              required
              type="number"
              min="0.01"
              max={total || undefined}
              step="0.01"
              value={retainer}
              onChange={(e) => setRetainer(e.target.value)}
            />
          </label>
          <label>
            Balance due date
            <input
              required
              type="date"
              value={balanceDueDate}
              onChange={(e) => setBalanceDueDate(e.target.value)}
            />
          </label>
          <label>
            Hold expires (Denver time)
            <input
              required
              type="datetime-local"
              value={holdExpiresAt}
              onChange={(e) => setHoldExpiresAt(e.target.value)}
            />
          </label>
          <label className="booking-full">
            Approved contract template
            <select
              required
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">Choose a template</option>
              {templates.map((template) => (
                <option value={template.id} key={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <details className="booking-full">
              <summary>Preview template text</summary>
              <div className="booking-contract-text">{selected.body}</div>
            </details>
          )}
          <fieldset className="booking-full booking-proposal-signers">
            <legend>Client signers</legend>
            <p className="booking-small">
              Use the email each signer will use to sign in. Each person signs
              independently.
            </p>
            {signers.map((signer, index) => (
              <div className="booking-signer-fields" key={index}>
                <label>
                  Signer {index + 1} name
                  <input
                    required
                    value={signer.name}
                    onChange={(e) =>
                      setSigners(
                        signers.map((p, i) =>
                          i === index ? { ...p, name: e.target.value } : p,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Email
                  <input
                    required
                    type="email"
                    value={signer.email}
                    onChange={(e) =>
                      setSigners(
                        signers.map((p, i) =>
                          i === index ? { ...p, email: e.target.value } : p,
                        ),
                      )
                    }
                  />
                </label>
                {signers.length > 1 && (
                  <button
                    className="booking-plain-button"
                    type="button"
                    onClick={() =>
                      setSigners(signers.filter((_, i) => i !== index))
                    }
                  >
                    Remove signer {index + 1}
                  </button>
                )}
              </div>
            ))}
            <button
              className="booking-plain-button"
              type="button"
              disabled={signers.length >= 6}
              onClick={() => setSigners([...signers, { name: "", email: "" }])}
            >
              + Add another signer
            </button>
          </fieldset>
          {error && (
            <p className="booking-alert booking-full" role="alert">
              {error}
            </p>
          )}
          <div className="booking-full">
            <button className="button" disabled={pending} type="submit">
              {pending ? "Preparing proposal…" : "Create proposal for review"}
            </button>
            <p className="booking-small">
              Review and sign the resulting agreement to issue it to your
              clients.
            </p>
          </div>
        </form>
      )}
    </section>
  );
}
function Templates({
  templates,
  onSaved,
}: {
  templates: ContractTemplate[];
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [approved, setApproved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!approved) return;
    setPending(true);
    try {
      await bookingPost("/api/booking/admin/templates", { name, body });
      setName("");
      setBody("");
      setApproved(false);
      await onSaved();
      setNotice("Contract template saved.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  };
  return (
    <section className="booking-panel">
      <h2>Contract templates.</h2>
      <p>
        Save your approved agreement text here. Each proposal keeps a fixed copy
        of the template used to create it.
      </p>
      <details className="booking-template-help">
        <summary>Fields you can include in your template</summary>
        <p>
          Use double braces around a field, such as{" "}
          <code>{"{{client_names}}"}</code>. These are replaced with the
          proposal’s details when you create it.
        </p>
        <div>
          {[
            "client_names",
            "event_date",
            "location",
            "coverage",
            "total",
            "retainer",
            "balance",
            "balance_due_date",
            "hold_expires_at",
            "photographer_name",
          ].map((field) => (
            <code key={field}>{"{{" + field + "}}"}</code>
          ))}
        </div>
      </details>
      {templates.length > 0 && (
        <div className="booking-template-list">
          {templates.map((template) => (
            <details key={template.id}>
              <summary>
                {template.name}{" "}
                <small>{readableDate(template.createdAt)}</small>
              </summary>
              <div className="booking-contract-text">{template.body}</div>
            </details>
          ))}
        </div>
      )}
      <form className="booking-form" onSubmit={submit}>
        <label className="booking-full">
          Template name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="booking-full">
          Approved contract text
          <textarea
            required
            rows={14}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Paste your approved photography agreement here."
          />
        </label>
        <label className="booking-checkbox booking-full">
          <input
            required
            type="checkbox"
            checked={approved}
            onChange={(e) => setApproved(e.target.checked)}
          />
          <span>
            This is the approved agreement text I want to use for proposals.
          </span>
        </label>
        {error && (
          <p className="booking-alert booking-full" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="booking-notice booking-full" role="status">
            {notice}
          </p>
        )}
        <div className="booking-full">
          <button className="button" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save contract template"}
          </button>
        </div>
      </form>
    </section>
  );
}
export default function AdminBookings() {
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [tab, setTab] = useState<"bookings" | "templates" | "operations">(
    "bookings",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [operationsKey, setOperationsKey] = useState(0);
  const load = useCallback(async () => {
    setError("");
    try {
      const [list, nextTemplates] = await Promise.all([
        bookingApi<BookingRequest[]>("/api/booking/admin/bookings"),
        bookingApi<ContractTemplate[]>("/api/booking/admin/templates"),
      ]);
      setBookings(list);
      setTemplates(nextTemplates);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);
  const loadDetail = useCallback(async () => {
    if (!selected) return;
    setError("");
    try {
      setDetail(
        await bookingApi<BookingDetail>(
          `/api/booking/admin/bookings/${encodeURIComponent(selected)}`,
        ),
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [selected]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (selected) {
      setLoading(true);
      setDetail(null);
      void loadDetail();
    }
  }, [selected, loadDetail]);
  const refreshed = async () => {
    await loadDetail();
    await load();
  };
  return (
    <div className="booking-admin">
      <nav className="booking-nav" aria-label="Booking administration">
        <button
          aria-pressed={tab === "bookings"}
          onClick={() => setTab("bookings")}
        >
          Bookings
        </button>
        <button
          aria-pressed={tab === "templates"}
          onClick={() => setTab("templates")}
        >
          Contract templates
        </button>
        <button
          aria-pressed={tab === "operations"}
          onClick={() => setTab("operations")}
        >
          Operations
        </button>
        <button
          onClick={() => {
            setOperationsKey((key) => key + 1);
            void (selected ? refreshed() : load());
          }}
        >
          Refresh
        </button>
      </nav>
      {error && (
        <p className="booking-alert" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Loading booking details…</p>
      ) : tab === "operations" ? (
        <Operations
          key={operationsKey}
          onOpenBooking={(id) => {
            setSelected(id);
            setTab("bookings");
          }}
        />
      ) : tab === "templates" ? (
        <Templates templates={templates} onSaved={load} />
      ) : selected && detail ? (
        <>
          <button
            className="booking-plain-button"
            onClick={() => {
              setSelected("");
              setDetail(null);
            }}
          >
            ← All bookings
          </button>
          <BookingDetailPanel admin detail={detail} onRefresh={refreshed} />
          <ProposalForm
            key={detail.proposal?.id || detail.booking.id}
            detail={detail}
            templates={templates}
            onCreated={refreshed}
          />
        </>
      ) : (
        <>
          <h2>Booking requests.</h2>
          {bookings.length ? (
            <div className="booking-list">
              {bookings.map((booking) => (
                <button
                  key={booking.id}
                  onClick={() => setSelected(booking.id)}
                >
                  <div>
                    <span className="eyebrow">
                      {readableDate(booking.eventDate)}
                    </span>
                    <h3>{booking.name}</h3>
                    <p>
                      {booking.email} · {booking.location}
                    </p>
                  </div>
                  <span className="booking-status">
                    {bookingStatusLabels[booking.status]}
                  </span>
                  <span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          ) : (
            <p>No booking requests yet.</p>
          )}
        </>
      )}
    </div>
  );
}
