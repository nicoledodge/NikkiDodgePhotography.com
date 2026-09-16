export class BookingApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function bookingApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const payload = (await response.json().catch(() => null)) as T & {
    error?: string | { message?: string };
    message?: string;
  };
  if (!response.ok) {
    if (response.status === 401)
      window.dispatchEvent(new Event("booking-session-expired"));
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : payload?.error?.message || payload?.message;
    throw new BookingApiError(
      message || "This request could not be completed. Please try again.",
      response.status,
    );
  }
  if (payload === null && response.status !== 204)
    throw new BookingApiError(
      "The service returned an unexpected response. Please try again.",
      response.status,
    );
  return payload;
}

export const bookingPost = <T>(path: string, body: unknown = {}) =>
  bookingApi<T>(path, { method: "POST", body: JSON.stringify(body) });
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export function readableDate(value?: string | null) {
  if (!value) return "To be confirmed";
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.valueOf())
    ? "To be confirmed"
    : date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "America/Denver",
      });
}
export function safeReturnPath(value: string | null, fallback = "/client") {
  if (!value || /[\u0000-\u0020\\]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://booking.invalid");
    if (
      url.origin !== "https://booking.invalid" ||
      !/^\/(book|client|admin)(\/|$)/.test(url.pathname)
    )
      return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
export const providerName = (provider: string) =>
  ({
    google: "Google",
    facebook: "Facebook",
    apple: "Apple",
    microsoft: "Microsoft",
    "microsoft-entra-id": "Microsoft",
    github: "GitHub",
  })[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
