import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  BookingUnavailable,
  useBooking,
} from "../components/booking/BookingContext";
import {
  bookingPost,
  errorMessage,
  providerName,
  safeReturnPath,
} from "../components/booking/api";

export default function Login() {
  const { user, status, loading, error: loadError, refresh } = useBooking();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeReturnPath(params.get("next"));
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, next, navigate]);
  const signIn = async (provider: string) => {
    setError("");
    setPending(provider);
    try {
      const result = await bookingPost<{ url?: string }>(
        "/api/auth/sign-in/social",
        {
          provider,
          callbackURL: new URL(next, window.location.origin).href,
          errorCallbackURL: new URL(
            `/login?next=${encodeURIComponent(next)}`,
            window.location.origin,
          ).href,
        },
      );
      if (!result.url)
        throw new Error("Sign-in did not start. Please try again.");
      const url = new URL(result.url);
      if (
        url.protocol !== "https:" &&
        !(url.protocol === "http:" && url.hostname === "localhost")
      )
        throw new Error("Unable to open the sign-in provider.");
      window.location.assign(url.href);
    } catch (cause) {
      setError(errorMessage(cause));
      setPending("");
    }
  };
  return (
    <div className="booking-page site-container">
      <div className="booking-login-layout">
        <figure>
          <img
            src="/assets/editorial/couples.webp"
            alt="A couple together in warm evening light"
            width="1200"
            height="1800"
          />
        </figure>
        <section>
          <p className="eyebrow">Welcome to your client space</p>
          <h1>
            Your story,
            <br />
            <em>all in one place.</em>
          </h1>
          <p>
            Review your proposal, sign your agreement, and manage payments
            securely.
          </p>
          {loading ? (
            <p role="status">Checking sign-in options…</p>
          ) : loadError ? (
            <>
              <p role="alert">Sign-in is temporarily unavailable.</p>
              <button className="button" onClick={() => void refresh()}>
                Try again
              </button>
            </>
          ) : !status?.providers.length ? (
            <BookingUnavailable />
          ) : (
            <div className="booking-social-buttons">
              {status.providers.map((provider) => (
                <button
                  className="button button--outline"
                  key={provider}
                  disabled={Boolean(pending)}
                  onClick={() => void signIn(provider)}
                >
                  {pending === provider
                    ? "Opening…"
                    : `Continue with ${providerName(provider)}`}
                  <span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          )}
          {(error || params.get("error")) && (
            <p className="booking-alert" role="alert">
              {error ||
                "Sign-in wasn’t completed. Please try again with your social account."}
            </p>
          )}
          <p className="booking-small">
            Use the account with the email address on your proposal. No separate
            password to remember.
          </p>
          <Link className="text-link" to="/Contact">
            Need a hand? Contact Nikki ↗
          </Link>
        </section>
      </div>
    </div>
  );
}
