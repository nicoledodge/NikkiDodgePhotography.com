import { createHash, randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { z } from "zod";
import type { PoolClient } from "pg";
import type {
  BookingUser,
  BookingDetail,
  BookingRequest,
  Proposal,
} from "../../shared/booking.js";
import { pool, withTransaction } from "./db.js";
import { storage } from "../storage.js";
import { checkCalendarFeedsForDate } from "../calendarFeeds.js";

export class BookingError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) => DateTime.fromISO(value, { zone: "America/Denver" }).isValid,
    "Enter a valid date.",
  );
const text = (max: number) => z.string().trim().min(1).max(max);
export const bookingInput = z.object({
  packageId: z.enum(["wedding", "custom"]),
  name: text(150),
  telephone: text(40),
  eventDate: date,
  location: text(300),
  message: text(5000),
});
export const proposalInput = z.object({
  coverage: text(5000),
  totalCents: z.number().int().positive().max(100000000),
  retainerCents: z.number().int().positive(),
  balanceDueDate: date,
  holdExpiresAt: z.string().datetime({ offset: true }),
  signers: z
    .array(
      z.object({
        name: text(150),
        email: z.email().trim().toLowerCase().max(254),
      }),
    )
    .min(1)
    .max(6),
  contractTemplateId: z.uuid(),
});
export const templateInput = z.object({ name: text(150), body: text(100000) });

export function camelRow<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase()),
      value instanceof Date ? value.toISOString() : value,
    ]),
  ) as T;
}
export async function createBooking(
  user: BookingUser,
  raw: unknown,
): Promise<BookingRequest> {
  const input = bookingInput.parse(raw);
  if (input.eventDate < DateTime.now().setZone("America/Denver").toISODate()!)
    throw new BookingError(400, "Choose today or a future date.");
  return withTransaction(async (db) => {
    const recent = await db.query(
      "SELECT id FROM booking_requests WHERE user_id=$1 AND created_at > now() - interval '1 hour'",
      [user.id],
    );
    if (recent.rowCount! >= 10)
      throw new BookingError(
        429,
        "Please wait before sending another date request.",
      );
    const result = await db.query(
      `INSERT INTO booking_requests(id,user_id,package_id,name,telephone,event_date,location,message) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        randomUUID(),
        user.id,
        input.packageId,
        input.name,
        input.telephone,
        input.eventDate,
        input.location,
        input.message,
      ],
    );
    const row = result.rows[0];
    await db.query(
      "INSERT INTO audit_events(id,booking_id,event_type,actor_id) VALUES($1,$2,'booking_requested',$3)",
      [randomUUID(), row.id, user.id],
    );
    await db.query(
      `INSERT INTO notification_jobs(id,kind,recipient,payload) VALUES($1,'email',$2,$3)`,
      [
        randomUUID(),
        user.email,
        JSON.stringify({
          subject: "Your photography date request",
          text: `Hi ${input.name},\n\nYour request for ${input.eventDate} has reached Nikki. This is a date request; your booking is confirmed after an approved contract is signed and the retainer is paid.\n\nView your request: ${process.env.BETTER_AUTH_URL || process.env.PUBLIC_APP_URL || "http://localhost:5173"}/client/bookings/${row.id}`,
        }),
      ],
    );
    const admins = await db.query(
      `SELECT email FROM "user" WHERE role='admin' AND "emailVerified"=true`,
    );
    for (const admin of admins.rows)
      await db.query(
        `INSERT INTO notification_jobs(id,kind,recipient,payload) VALUES($1,'email',$2,$3)`,
        [
          randomUUID(),
          admin.email,
          JSON.stringify({
            subject: "New photography date request",
            text: `${input.name} requested ${input.eventDate} for ${input.packageId} coverage. Review the request in your website admin.`,
          }),
        ],
      );
    return camelRow<BookingRequest>(row);
  });
}
export async function listBookings(
  user: BookingUser,
  admin = false,
): Promise<BookingRequest[]> {
  if (!pool) throw new BookingError(503, "Booking is not configured.");
  const query = admin
    ? `SELECT b.*,u.email FROM booking_requests b JOIN "user" u ON u.id=b.user_id ORDER BY b.created_at DESC`
    : `SELECT b.* FROM booking_requests b WHERE b.user_id=$1 OR EXISTS(SELECT 1 FROM proposals p JOIN proposal_signers s ON s.proposal_id=p.id WHERE p.booking_id=b.id AND p.status NOT IN ('draft','superseded') AND (s.user_id=$1 OR (s.user_id IS NULL AND $3 AND lower(s.email)=lower($2)))) ORDER BY b.created_at DESC`;
  const rows = await pool.query(
    query,
    admin ? [] : [user.id, user.email, user.emailVerified],
  );
  return rows.rows.map((row) => camelRow<BookingRequest>(row));
}
export async function bookingDetail(
  user: BookingUser,
  id: string,
): Promise<BookingDetail> {
  if (!pool) throw new BookingError(503, "Booking is not configured.");
  z.uuid().parse(id);
  const b = await pool.query(
    `SELECT b.*,u.email FROM booking_requests b JOIN "user" u ON u.id=b.user_id WHERE b.id=$1`,
    [id],
  );
  if (!b.rows[0]) throw new BookingError(404, "Booking not found.");
  const admin = user.role === "admin";
  const p = await pool.query(
    `SELECT * FROM proposals WHERE booking_id=$1 ${admin ? "" : "AND status <> 'draft'"} ORDER BY version DESC LIMIT 1`,
    [id],
  );
  const proposal = p.rows[0];
  const s = proposal
    ? await pool.query(
        "SELECT * FROM proposal_signers WHERE proposal_id=$1 ORDER BY role,name",
        [proposal.id],
      )
    : { rows: [] };
  if (
    !admin &&
    b.rows[0].user_id !== user.id &&
    !s.rows.some(
      (signer) =>
        signer.user_id === user.id ||
        (!signer.user_id &&
          user.emailVerified &&
          signer.email.toLowerCase() === user.email.toLowerCase()),
    )
  )
    throw new BookingError(404, "Booking not found.");
  const payments = proposal
    ? await pool.query(
        "SELECT id,proposal_id,kind,amount_cents,status,created_at FROM payments WHERE proposal_id=$1 ORDER BY created_at",
        [proposal.id],
      )
    : { rows: [] };
  const signatures = proposal
    ? await pool.query(
        "SELECT id,signer_id,proposal_id,legal_name,method,signed_at FROM signatures WHERE proposal_id=$1",
        [proposal.id],
      )
    : { rows: [] };
  return {
    booking: camelRow(b.rows[0]),
    proposal: proposal ? camelRow(proposal) : null,
    signers: s.rows.map((row) => camelRow(row)),
    payments: payments.rows.map((row) => camelRow(row)),
    signatures: signatures.rows.map((row) => camelRow(row)),
    contractText: proposal?.contract_snapshot ?? null,
  };
}

export async function assertLegacyDateAvailable(
  eventDate: string,
): Promise<void> {
  const [events, feeds] = await Promise.all([
    storage.getCalendar(),
    storage.getCalendarFeeds(),
  ]);
  let feedBusy = false;
  try {
    feedBusy = await checkCalendarFeedsForDate(feeds, eventDate);
  } catch {
    throw new BookingError(
      409,
      "A connected calendar could not be checked completely. Resolve its availability data before approving this date.",
    );
  }
  const start = DateTime.fromISO(eventDate, { zone: "America/Denver" });
  const end = start.plus({ days: 1 });
  if (
    feedBusy ||
    events.some(
      (event) =>
        event.status !== "cancelled" &&
        DateTime.fromISO(event.start) < end &&
        DateTime.fromISO(event.end) > start,
    )
  )
    throw new BookingError(
      409,
      "This date conflicts with an existing calendar event.",
    );
}

export async function withScheduleLock<T>(
  fn: (db: PoolClient | null) => Promise<T>,
): Promise<T> {
  if (!pool) return fn(null);
  return withTransaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(846191002)");
    return fn(db);
  });
}
export async function assertNoReservationConflict(
  start: string,
  end: string,
  connection: Pick<PoolClient, "query"> | null = pool,
): Promise<void> {
  if (!connection) return;
  const result = await connection.query(
    `SELECT id FROM reservations WHERE status IN ('held','confirmed') AND (event_date::timestamp AT TIME ZONE 'America/Denver') < $2::timestamptz AND ((event_date+1)::timestamp AT TIME ZONE 'America/Denver') > $1::timestamptz LIMIT 1`,
    [start, end],
  );
  if (result.rowCount)
    throw new BookingError(
      409,
      "This calendar event overlaps an active booking or date hold.",
    );
}
export async function bookingCalendarEvents() {
  if (!pool) return [];
  const result = await pool.query(
    `SELECT b.*,r.status AS reservation_status FROM reservations r JOIN booking_requests b ON b.id=r.booking_id WHERE r.status IN ('held','confirmed')`,
  );
  return result.rows.map((row) => ({
    id: `booking-${row.id}`,
    title: `${row.reservation_status === "confirmed" ? "Booked" : "Date hold"} — ${row.name}`,
    clientName: row.name,
    start: DateTime.fromISO(row.event_date, {
      zone: "America/Denver",
    }).toISO()!,
    end: DateTime.fromISO(row.event_date, { zone: "America/Denver" })
      .plus({ days: 1 })
      .toISO()!,
    location: row.location,
    status:
      row.reservation_status === "confirmed"
        ? ("confirmed" as const)
        : ("tentative" as const),
    notes: "Managed in Bookings & Contracts.",
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

export function freezeContract(
  body: string,
  values: Record<string, string>,
): string {
  return body.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_, key: string) => {
    if (!(key in values))
      throw new BookingError(400, `Unsupported contract field: ${key}`);
    return values[key];
  });
}

export async function createProposal(
  user: BookingUser,
  bookingId: string,
  raw: unknown,
): Promise<Proposal> {
  const input = proposalInput.parse(raw);
  z.uuid().parse(bookingId);
  if (input.retainerCents > input.totalCents)
    throw new BookingError(400, "The retainer cannot exceed the total.");
  if (Date.parse(input.holdExpiresAt) < Date.now() + 31 * 60 * 1000)
    throw new BookingError(
      400,
      "Allow at least 31 minutes before the hold expires.",
    );
  const emails = input.signers.map((s) => s.email);
  if (
    new Set(emails).size !== emails.length ||
    emails.includes(user.email.toLowerCase())
  )
    throw new BookingError(
      400,
      "Each client signer needs a different email from other signers and Nikki.",
    );
  return withTransaction(async (db) => {
    // Both legacy calendar writes and proposals take this lock before checking availability.
    await db.query("SELECT pg_advisory_xact_lock(846191002)");
    const previous = await db.query(
      "SELECT * FROM proposals WHERE booking_id=$1 ORDER BY version DESC FOR UPDATE",
      [bookingId],
    );
    const result = await db.query(
      `SELECT b.*,u.email FROM booking_requests b JOIN "user" u ON u.id=b.user_id WHERE b.id=$1 FOR UPDATE OF b`,
      [bookingId],
    );
    const booking = result.rows[0];
    if (!booking) throw new BookingError(404, "Booking not found.");
    if (["confirmed", "cancelled"].includes(booking.status))
      throw new BookingError(
        409,
        "This booking cannot receive a replacement proposal.",
      );
    if (
      booking.event_date < DateTime.now().setZone("America/Denver").toISODate()!
    )
      throw new BookingError(400, "The requested event date has passed.");
    if (
      input.balanceDueDate <
      DateTime.now().setZone("America/Denver").toISODate()!
    )
      throw new BookingError(
        400,
        "The balance due date cannot be in the past.",
      );
    if (input.balanceDueDate > booking.event_date)
      throw new BookingError(
        400,
        "The balance due date must be on or before the event date.",
      );
    if (!emails.includes(booking.email.toLowerCase()))
      throw new BookingError(
        400,
        "Include the requesting client as a required signer.",
      );
    await assertLegacyDateAvailable(booking.event_date);
    const template = await db.query("SELECT * FROM templates WHERE id=$1", [
      input.contractTemplateId,
    ]);
    if (!template.rows[0])
      throw new BookingError(400, "Choose an approved contract template.");
    const pending = await db.query(
      "SELECT id FROM payments WHERE proposal_id=ANY($1::uuid[]) AND status IN ('pending','paid')",
      [previous.rows.map((p) => p.id)],
    );
    if (pending.rowCount)
      throw new BookingError(
        409,
        "Resolve existing payment sessions before replacing this proposal.",
      );
    await db.query(
      "UPDATE proposals SET status='superseded' WHERE booking_id=$1 AND status IN ('draft','sent','signed','expired')",
      [bookingId],
    );
    await db.query(
      "UPDATE reservations SET status='released' WHERE booking_id=$1 AND status='held'",
      [bookingId],
    );
    const money = (cents: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(cents / 100);
    const hold = DateTime.fromISO(input.holdExpiresAt)
      .setZone("America/Denver")
      .toFormat("MMMM d, yyyy 'at' h:mm a ZZZZ");
    const values = {
      client_names: input.signers.map((s) => s.name).join(" & "),
      event_date: booking.event_date,
      location: booking.location,
      coverage: input.coverage,
      total: money(input.totalCents),
      retainer: money(input.retainerCents),
      balance: money(input.totalCents - input.retainerCents),
      balance_due_date: input.balanceDueDate,
      hold_expires_at: hold,
      photographer_name: user.name,
    };
    const summary = `PHOTOGRAPHY BOOKING DETAILS\n\nClients: ${values.client_names}\nPhotographer: ${values.photographer_name}\nEvent date: ${values.event_date}\nLocation: ${values.location}\nCoverage: ${values.coverage}\nTotal (USD): ${values.total}\nRetainer: ${values.retainer}\nRemaining balance: ${values.balance}\nBalance due: ${values.balance_due_date}\nDate hold expires: ${values.hold_expires_at}\n\n`;
    const snapshot = summary + freezeContract(template.rows[0].body, values);
    const id = randomUUID();
    const version = (previous.rows[0]?.version ?? 0) + 1;
    const created = await db.query(
      `INSERT INTO proposals(id,booking_id,version,coverage,total_cents,retainer_cents,balance_due_date,hold_expires_at,contract_snapshot,contract_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        id,
        bookingId,
        version,
        input.coverage,
        input.totalCents,
        input.retainerCents,
        input.balanceDueDate,
        input.holdExpiresAt,
        snapshot,
        createHash("sha256").update(snapshot).digest("hex"),
      ],
    );
    await db.query(
      "INSERT INTO reservations(id,booking_id,proposal_id,event_date,status) VALUES($1,$2,$3,$4,'held')",
      [randomUUID(), bookingId, id, booking.event_date],
    );
    await db.query(
      "INSERT INTO proposal_signers(id,proposal_id,user_id,email,name,role) VALUES($1,$2,$3,$4,$5,'admin')",
      [randomUUID(), id, user.id, user.email.toLowerCase(), user.name],
    );
    for (const signer of input.signers)
      await db.query(
        "INSERT INTO proposal_signers(id,proposal_id,user_id,email,name,role) VALUES($1,$2,$3,$4,$5,'client')",
        [
          randomUUID(),
          id,
          signer.email === booking.email.toLowerCase() ? booking.user_id : null,
          signer.email,
          signer.name,
        ],
      );
    await db.query(
      "UPDATE booking_requests SET status='proposed',updated_at=now() WHERE id=$1",
      [bookingId],
    );
    await db.query(
      "INSERT INTO audit_events(id,booking_id,proposal_id,event_type,actor_id,details) VALUES($1,$2,$3,'proposal_created',$4,$5)",
      [
        randomUUID(),
        bookingId,
        id,
        user.id,
        JSON.stringify({ version, templateId: input.contractTemplateId }),
      ],
    );
    return camelRow<Proposal>(created.rows[0]);
  });
}
