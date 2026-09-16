import { Link } from "react-router-dom";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  BookingGate,
  ClientNavigation,
  useBooking,
} from "../components/booking/BookingContext";
import {
  bookingApi,
  bookingPost,
  errorMessage,
  providerName,
} from "../components/booking/api";

interface SocialAccount {
  id: string;
  accountId: string;
  providerId: string;
}
export function EmailVerification() {
  const { user, refresh } = useBooking();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const send = async () => {
    setPending(true);
    setError("");
    setMessage("");
    try {
      await bookingPost("/api/auth/send-verification-email", {
        email: user?.email,
        callbackURL: "/client",
      });
      setMessage(
        "Check your email for a verification link. Return here after verifying to continue.",
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  };
  if (user?.email.endsWith("@identity.invalid"))
    return (
      <section className="booking-verification">
        <h2>Add your contact email.</h2>
        <p>
          Your social provider did not supply an email address. Add and verify
          the address you’d like to use for your booking.
        </p>
        <Link className="text-link" to="/client/settings">
          Update my contact email ↗
        </Link>
      </section>
    );
  return (
    <section className="booking-verification">
      <h2>Verify your contact email.</h2>
      <p>
        Please verify {user?.email} before requesting a proposal, signing, or
        paying.
      </p>
      <div className="booking-actions">
        <button
          className="button"
          disabled={pending}
          onClick={() => void send()}
        >
          {pending ? "Sending…" : "Send verification email"}
        </button>
        <button className="booking-plain-button" onClick={() => void refresh()}>
          I’ve verified my email
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="booking-alert" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
function AccountSettings() {
  const { user, status } = useBooking();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await bookingApi<SocialAccount[]>(
        "/api/auth/list-accounts",
      );
      setAccounts(result);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const link = async (provider: string) => {
    setPending(provider);
    setError("");
    try {
      const result = await bookingPost<{ url?: string }>(
        "/api/auth/link-social",
        { provider, callbackURL: "/client/settings" },
      );
      if (!result.url)
        throw new Error("The provider could not be opened. Please try again.");
      const url = new URL(result.url);
      if (url.protocol !== "https:")
        throw new Error("The provider returned an invalid address.");
      window.location.assign(url.href);
    } catch (cause) {
      setError(errorMessage(cause));
      setPending("");
    }
  };
  const unlink = async (account: SocialAccount) => {
    if (accounts.length < 2) return;
    setPending(account.providerId);
    setError("");
    try {
      await bookingPost("/api/auth/unlink-account", { accountId: account.id });
      await load();
      setMessage(`${providerName(account.providerId)} has been unlinked.`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending("");
    }
  };
  const changeEmail = async (event: FormEvent) => {
    event.preventDefault();
    setPending("email");
    setError("");
    setMessage("");
    try {
      await bookingPost("/api/auth/change-email", {
        newEmail: email,
        callbackURL: "/client/settings",
      });
      setMessage(
        "Check your email for the confirmation link to complete this change.",
      );
      setEmail("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending("");
    }
  };
  return (
    <>
      <ClientNavigation />
      <header className="booking-heading">
        <p className="eyebrow">Your account</p>
        <h1>A few personal details.</h1>
      </header>
      <section className="booking-panel">
        <h2>Contact email</h2>
        <p>
          {user?.email} ·{" "}
          {user?.emailVerified ? "Verified" : "Verification needed"}
        </p>
        {!user?.emailVerified && <EmailVerification />}
        <form className="booking-email-form" onSubmit={changeEmail}>
          <label>
            New contact email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button
            className="button button--outline"
            disabled={Boolean(pending)}
            type="submit"
          >
            Update email
          </button>
        </form>
      </section>
      <section className="booking-panel">
        <h2>Connected accounts</h2>
        <p>
          Connect another account while signed in. Keep at least one connected
          so you can always return.
        </p>
        {loading ? (
          <p role="status">Loading connected accounts…</p>
        ) : (
          <div className="booking-accounts">
            {status?.providers.map((provider) => {
              const account = accounts.find(
                (item) => item.providerId === provider,
              );
              return (
                <div key={provider}>
                  <span>
                    {providerName(provider)}{" "}
                    <small>{account ? "Connected" : "Not connected"}</small>
                  </span>
                  {account ? (
                    <button
                      className="booking-plain-button"
                      disabled={Boolean(pending) || accounts.length < 2}
                      onClick={() => void unlink(account)}
                    >
                      Unlink
                    </button>
                  ) : (
                    <button
                      className="button button--outline"
                      disabled={Boolean(pending)}
                      onClick={() => void link(provider)}
                    >
                      Connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      {error && (
        <p className="booking-alert" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="booking-notice" role="status">
          {message}
        </p>
      )}
    </>
  );
}
export default function ClientSettings() {
  return (
    <div className="booking-page site-container">
      <BookingGate requireEnabled={false}>
        <AccountSettings />
      </BookingGate>
    </div>
  );
}
