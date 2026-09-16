import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { BookingRequest } from "../shared/booking";
import {
  BookingGate,
  ClientNavigation,
  useBooking,
} from "../components/booking/BookingContext";
import {
  bookingApi,
  errorMessage,
  readableDate,
} from "../components/booking/api";
import { bookingStatusLabels } from "../components/booking/BookingDetailPanel";
import { EmailVerification } from "./ClientSettings";

function BookingList() {
  const { user } = useBooking();
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setBookings(await bookingApi<BookingRequest[]>("/api/booking/bookings"));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <>
      <ClientNavigation />
      <header className="booking-heading">
        <p className="eyebrow">Your client space</p>
        <h1>
          Good to see you,
          <br />
          <em>{user?.name.split(" ")[0] || "friend"}.</em>
        </h1>
        <p>Your requests, agreements, and payments, together in one place.</p>
      </header>
      {!user?.emailVerified && <EmailVerification />}
      {loading ? (
        <p role="status">Loading your bookings…</p>
      ) : error ? (
        <>
          <p className="booking-alert" role="alert">
            {error}
          </p>
          <button className="button" onClick={() => void load()}>
            Try again
          </button>
        </>
      ) : bookings.length ? (
        <div className="booking-list">
          {bookings.map((booking) => (
            <Link
              to={`/client/bookings/${encodeURIComponent(booking.id)}`}
              key={booking.id}
            >
              <div>
                <span className="eyebrow">
                  {booking.packageId === "wedding"
                    ? "Wedding"
                    : "Session / event"}
                </span>
                <h2>{readableDate(booking.eventDate)}</h2>
                <p>{booking.location}</p>
              </div>
              <span className="booking-status">
                {bookingStatusLabels[booking.status]}
              </span>
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      ) : (
        <section className="booking-empty">
          <h2>Your story starts here.</h2>
          <p>You don’t have any booking requests yet.</p>
          <Link className="button" to="/book">
            Request a date ↗
          </Link>
        </section>
      )}
    </>
  );
}
export default function Client() {
  return (
    <div className="booking-page site-container">
      <BookingGate requireEnabled={false}>
        <BookingList />
      </BookingGate>
    </div>
  );
}
