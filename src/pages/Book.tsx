import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BookingGate, useBooking } from "../components/booking/BookingContext";
import { EmailVerification } from "./ClientSettings";
import { bookingPost, errorMessage } from "../components/booking/api";

export default function Book() {
  const { user } = useBooking();
  const [params, setParams] = useSearchParams();
  const packageId = params.get("package") === "wedding" ? "wedding" : "custom";
  const navigate = useNavigate();
  const [draft, setDraft] = useState({
    name: "",
    telephone: "",
    eventDate: "",
    location: "",
    message: "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (user?.name)
      setDraft((previous) => ({
        ...previous,
        name: previous.name || user.name,
      }));
  }, [user?.name]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    try {
      const result = await bookingPost<{
        id?: string;
        booking?: { id: string };
      }>("/api/booking/bookings", { packageId, ...draft });
      const id = result.booking?.id || result.id;
      if (!id)
        throw new Error(
          "The request could not be confirmed. Please check your bookings before trying again.",
        );
      navigate(`/client/bookings/${encodeURIComponent(id)}`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  };
  const minDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return (
    <div className="booking-page site-container">
      <header className="booking-heading">
        <p className="eyebrow">Let’s make a plan</p>
        <h1>
          A date. An idea.
          <br />
          <em>Your next chapter.</em>
        </h1>
        <p>
          Tell me what you’re planning. I’ll review the details and prepare a
          proposal for you.
        </p>
      </header>
      <div
        className="booking-package-options"
        role="group"
        aria-label="Choose your photography service"
      >
        <button
          aria-pressed={packageId === "wedding"}
          onClick={() => setParams({ package: "wedding" })}
        >
          <span className="eyebrow">01 / Wedding photography</span>
          <strong>Your wedding story</strong>
          <span>Collections from $3,000 · A personal proposal follows</span>
        </button>
        <button
          aria-pressed={packageId === "custom"}
          onClick={() => setParams({ package: "custom" })}
        >
          <span className="eyebrow">02 / A session or event</span>
          <strong>Something of your own</strong>
          <span>Portraits, families, music, sports & creative projects</span>
        </button>
      </div>
      <BookingGate>
        {!user?.emailVerified ? (
          <EmailVerification />
        ) : (
          <div className="booking-request-layout">
            <div>
              <h2>Start with the details.</h2>
              <p>
                Requesting a date is the first step. Your date is confirmed
                after the agreement is fully signed and the retainer payment is
                confirmed.
              </p>
              <p className="booking-small">Signed in as {user?.email}</p>
              <Link className="text-link" to="/client">
                View my requests ↗
              </Link>
            </div>
            <form className="booking-form" onSubmit={submit}>
              <label>
                Your name
                <input
                  required
                  name="name"
                  autoComplete="name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label>
                Phone number
                <input
                  required
                  name="telephone"
                  type="tel"
                  autoComplete="tel"
                  value={draft.telephone}
                  onChange={(e) =>
                    setDraft({ ...draft, telephone: e.target.value })
                  }
                />
              </label>
              <label>
                Preferred date
                <input
                  required
                  name="eventDate"
                  type="date"
                  min={minDate}
                  value={draft.eventDate}
                  onChange={(e) =>
                    setDraft({ ...draft, eventDate: e.target.value })
                  }
                />
              </label>
              <label>
                Location or venue
                <input
                  required
                  name="location"
                  value={draft.location}
                  onChange={(e) =>
                    setDraft({ ...draft, location: e.target.value })
                  }
                />
              </label>
              <label className="booking-full">
                Tell me what you have in mind
                <textarea
                  required
                  name="message"
                  rows={5}
                  value={draft.message}
                  onChange={(e) =>
                    setDraft({ ...draft, message: e.target.value })
                  }
                />
              </label>
              {error && (
                <p className="booking-alert booking-full" role="alert">
                  {error}
                </p>
              )}
              <div className="booking-full">
                <button className="button" type="submit" disabled={pending}>
                  {pending ? "Sending your request…" : "Request a proposal ↗"}
                </button>
              </div>
            </form>
          </div>
        )}
      </BookingGate>
    </div>
  );
}
