import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { bookingApi, bookingPost, errorMessage } from "./api";
import "../../styles/booking.css";

import type { BookingUser, BookingStatus } from "../../shared/booking";
export type { BookingUser, BookingStatus } from "../../shared/booking";
interface Session {
  user: BookingUser | null;
  providers: string[];
}
interface BookingContextValue {
  user: BookingUser | null;
  status: BookingStatus | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}
const Context = createContext<BookingContextValue | null>(null);
export function BookingProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BookingUser | null>(null);
  const [status, setStatus] = useState<BookingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [nextStatus, session] = await Promise.all([
        bookingApi<BookingStatus>("/api/booking/status"),
        bookingApi<Session>("/api/booking/session"),
      ]);
      setStatus(nextStatus);
      setUser(session.user);
    } catch (cause) {
      setError(errorMessage(cause));
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener("booking-session-expired", expired);
    return () => window.removeEventListener("booking-session-expired", expired);
  }, []);
  const signOut = async () => {
    await bookingPost("/api/auth/sign-out");
    setUser(null);
  };
  return (
    <Context.Provider
      value={{ user, status, loading, error, refresh, signOut }}
    >
      {children}
    </Context.Provider>
  );
}
export function useBooking() {
  const context = useContext(Context);
  if (!context) throw new Error("BookingProvider required");
  return context;
}
export function BookingUnavailable() {
  return (
    <section className="booking-empty">
      <p className="eyebrow">Let’s stay in touch</p>
      <h2>Online booking is not available yet.</h2>
      <p>
        You can still send Nikki your date and plans. We’ll work through the
        details together.
      </p>
      <Link className="text-link" to="/Contact">
        Send a general inquiry ↗
      </Link>
    </section>
  );
}
export function BookingGate({
  children,
  admin = false,
  requireEnabled = true,
}: {
  children: ReactNode;
  admin?: boolean;
  requireEnabled?: boolean;
}) {
  const { user, status, loading, error, refresh } = useBooking();
  const location = useLocation();
  if (loading)
    return (
      <p className="booking-loading" role="status">
        Loading your account…
      </p>
    );
  if (error)
    return (
      <section className="booking-empty">
        <h2>We couldn’t connect.</h2>
        <p role="alert">{error}</p>
        <button className="button" onClick={() => void refresh()}>
          Try again
        </button>
        <Link className="text-link" to="/Contact">
          Contact Nikki ↗
        </Link>
      </section>
    );
  if (requireEnabled && !status?.enabled) return <BookingUnavailable />;
  if (!user)
    return (
      <section className="booking-empty">
        <p className="eyebrow">Your client space</p>
        <h2>A simple, secure way to begin.</h2>
        <p>
          Sign in with your social account to request a date, review your
          proposal, and keep everything in one place.
        </p>
        <Link
          className="button"
          to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        >
          Continue to sign in ↗
        </Link>
        <Link className="text-link" to="/Contact">
          Just have a question? ↗
        </Link>
      </section>
    );
  if (admin && user.role !== "admin")
    return (
      <section className="booking-empty">
        <h2>This page is for Nikki’s team.</h2>
        <p>Your bookings are available in your client space.</p>
        <Link className="button" to="/client">
          Go to my bookings ↗
        </Link>
      </section>
    );
  return <>{children}</>;
}
export function ClientNavigation() {
  const { user, signOut } = useBooking();
  const [error, setError] = useState("");
  return (
    <>
      <nav className="booking-nav" aria-label="Client navigation">
        <Link to="/client">My bookings</Link>
        <Link to="/book">Request a date</Link>
        <Link to="/client/settings">Account</Link>
        {user?.role === "admin" && <Link to="/admin">Admin</Link>}
        <button
          onClick={() =>
            void signOut().catch((cause) => setError(errorMessage(cause)))
          }
        >
          Sign out
        </button>
      </nav>
      {error && (
        <p className="booking-alert" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
