import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { BookingDetail } from "../shared/booking";
import {
  BookingGate,
  ClientNavigation,
} from "../components/booking/BookingContext";
import { bookingApi, errorMessage } from "../components/booking/api";
import BookingDetailPanel from "../components/booking/BookingDetailPanel";

function BookingContent() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setError("");
    try {
      setDetail(
        await bookingApi<BookingDetail>(
          `/api/booking/bookings/${encodeURIComponent(id || "")}`,
        ),
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);
  useEffect(() => {
    if (!params.has("checkout") && !params.has("session_id")) return;
    let count = 0;
    const timer = window.setInterval(() => {
      count++;
      void load();
      if (count >= 15) window.clearInterval(timer);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [params, load]);
  return (
    <>
      <ClientNavigation />
      <Link className="text-link" to="/client">
        ← All bookings
      </Link>
      {loading ? (
        <p className="booking-loading" role="status">
          Loading your booking…
        </p>
      ) : error ? (
        <section className="booking-empty">
          <p className="booking-alert" role="alert">
            {error}
          </p>
          <button className="button" onClick={() => void load()}>
            Try again
          </button>
        </section>
      ) : detail ? (
        <BookingDetailPanel detail={detail} onRefresh={load} />
      ) : null}
    </>
  );
}
export default function ClientBooking() {
  return (
    <div className="booking-page site-container">
      <BookingGate requireEnabled={false}>
        <BookingContent />
      </BookingGate>
    </div>
  );
}
