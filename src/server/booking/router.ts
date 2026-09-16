import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  auth,
  configuredProviders,
  getBookingUser,
  requireBookingUser,
  requireVerifiedContact,
  requireBookingAdmin,
  sameOriginMutation,
} from "./auth.js";
import { pool } from "./db.js";
import {
  BookingError,
  bookingDetail,
  camelRow,
  createBooking,
  createProposal,
  listBookings,
  templateInput,
} from "./service.js";
import { signProposal } from "./signing.js";
import { createCheckout } from "./payments.js";
import { getDocument } from "./documents.js";
import { getDocumentReadiness } from "./documents.js";
import { getPaymentReadiness } from "./payments.js";
import { getEmailReadiness } from "./worker.js";

export const bookingRouter = Router();
export const bookingEnabled = () =>
  process.env.BOOKING_ENABLED === "true" && !!auth && !!pool;
const run =
  (handler: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };
const id = (req: Request) => z.uuid().parse(req.params.id);

bookingRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
bookingRouter.get("/status", (_req, res) => {
  res.json({
    enabled: bookingEnabled(),
    providers: auth ? configuredProviders : [],
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  });
});
bookingRouter.get(
  "/session",
  run(async (req, res) => {
    res.json({
      user: await getBookingUser(req),
      providers: auth ? configuredProviders : [],
    });
  }),
);
bookingRouter.use(sameOriginMutation);
bookingRouter.use((_req, res, next) => {
  // Admin may configure templates and bootstrap before opening date requests.
  if (!pool || !auth) {
    res
      .status(503)
      .json({
        error:
          "Online booking is being prepared. Please contact Nikki for availability.",
      });
    return;
  }
  next();
});

bookingRouter.get(
  "/bookings",
  requireBookingUser,
  run(async (req, res) => {
    res.json(await listBookings(req.bookingUser!));
  }),
);
bookingRouter.post(
  "/bookings",
  (_req, res, next) => {
    if (!bookingEnabled()) {
      res.status(503).json({ error: "Date requests are currently paused. Please contact Nikki for availability." });
      return;
    }
    next();
  },
  requireBookingUser,
  requireVerifiedContact,
  run(async (req, res) => {
    res.status(201).json(await createBooking(req.bookingUser!, req.body));
  }),
);
bookingRouter.get(
  "/bookings/:id",
  requireBookingUser,
  run(async (req, res) => {
    res.json(await bookingDetail(req.bookingUser!, id(req)));
  }),
);
bookingRouter.get(
  "/admin/bookings",
  requireBookingAdmin,
  run(async (req, res) => {
    res.json(await listBookings(req.bookingUser!, true));
  }),
);
bookingRouter.get(
  "/admin/bookings/:id",
  requireBookingAdmin,
  run(async (req, res) => {
    res.json(await bookingDetail(req.bookingUser!, id(req)));
  }),
);
bookingRouter.post(
  "/admin/bookings/:id/proposals",
  requireBookingAdmin,
  run(async (req, res) => {
    res
      .status(201)
      .json(await createProposal(req.bookingUser!, id(req), req.body));
  }),
);
bookingRouter.get(
  "/admin/templates",
  requireBookingAdmin,
  run(async (_req, res) => {
    res.json(
      (
        await pool!.query("SELECT * FROM templates ORDER BY created_at DESC")
      ).rows.map((row) => camelRow(row)),
    );
  }),
);
bookingRouter.post(
  "/admin/templates",
  requireBookingAdmin,
  run(async (req, res) => {
    const data = templateInput.parse(req.body);
    const result = await pool!.query(
      "INSERT INTO templates(id,name,body) VALUES($1,$2,$3) RETURNING *",
      [randomUUID(), data.name, data.body],
    );
    res.status(201).json(camelRow(result.rows[0]));
  }),
);
bookingRouter.get(
  "/admin/system",
  requireBookingAdmin,
  run(async (_req, res) => {
    const counts = await pool!.query(`SELECT
    (SELECT count(*)::integer FROM notification_jobs WHERE status='failed') AS failed_jobs,
    (SELECT count(*)::integer FROM notification_jobs WHERE status IN ('pending','processing')) AS queued_jobs,
    (SELECT count(*)::integer FROM reservations r JOIN proposals p ON p.id=r.proposal_id WHERE r.status='held' AND p.hold_expires_at<now()) AS overdue_holds`);
    const reviews = await pool!.query(
      `SELECT p.id,p.booking_id,b.name FROM payments pay JOIN proposals p ON p.id=pay.proposal_id JOIN booking_requests b ON b.id=p.booking_id WHERE pay.kind='retainer' AND pay.status='paid' AND p.status<>'confirmed'`,
    );
    res.json({
      intakeEnabled: bookingEnabled(),
      providers: configuredProviders,
      documents: getDocumentReadiness(),
      payments: getPaymentReadiness(),
      email: getEmailReadiness(),
      ...camelRow<Record<string, number>>(counts.rows[0]),
      paymentReviews: reviews.rows.map((row) => camelRow(row)),
    });
  }),
);
bookingRouter.get(
  "/admin/jobs",
  requireBookingAdmin,
  run(async (_req, res) => {
    res.json(
      (
        await pool!.query(
          "SELECT id,kind,recipient,status,attempts,last_error,created_at FROM notification_jobs WHERE status IN ('failed','pending','processing') ORDER BY CASE WHEN status='failed' THEN 0 ELSE 1 END,created_at DESC LIMIT 100",
        )
      ).rows.map((row) => camelRow(row)),
    );
  }),
);
bookingRouter.post(
  "/admin/jobs/:id/retry",
  requireBookingAdmin,
  run(async (req, res) => {
    const result = await pool!.query(
      "UPDATE notification_jobs SET status='pending',attempts=0,next_attempt_at=now(),last_error=NULL WHERE id=$1 AND status='failed' RETURNING id",
      [id(req)],
    );
    if (!result.rowCount)
      throw new BookingError(409, "Only failed jobs can be retried.");
    res.json({ ok: true });
  }),
);
bookingRouter.post(
  "/proposals/:id/sign",
  requireBookingUser,
  requireVerifiedContact,
  run(async (req, res) => {
    res.json(
      await signProposal(req.bookingUser!, id(req), req.body, {
        ip: req.ip || "",
        userAgent: (req.get("user-agent") || "").slice(0, 1000),
      }),
    );
  }),
);
bookingRouter.post(
  "/proposals/:id/checkout",
  requireBookingUser,
  requireVerifiedContact,
  run(async (req, res) => {
    const { kind } = z
      .object({ kind: z.enum(["retainer", "balance"]) })
      .parse(req.body);
    res.json(await createCheckout(req.bookingUser!, id(req), kind));
  }),
);
for (const [suffix, kind] of [
  ["pdf", "contract"],
  ["certificate", "certificate"],
] as const)
  bookingRouter.get(
    `/contracts/:id/${suffix}`,
    requireBookingUser,
    run(async (req, res) => {
      const document = await getDocument(req.bookingUser!, id(req), kind);
      res.setHeader("Content-Type", document.contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${document.fileName}"`,
      );
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.send(document.buffer);
    }),
  );

bookingRouter.use(
  (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({
          error: error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(" "),
        });
      return;
    }
    const candidate = error as { statusCode?: number; code?: string };
    if (candidate.code === "23505") {
      res
        .status(409)
        .json({
          error:
            "This date or action is already reserved. Refresh and try again.",
        });
      return;
    }
    const status =
      error instanceof BookingError ? error.statusCode : candidate.statusCode;
    if (status && status >= 400 && status < 500) {
      res
        .status(status)
        .json({
          error: error instanceof Error ? error.message : "Request failed.",
        });
      return;
    }
    console.error(
      "Booking request failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    res
      .status(503)
      .json({
        error:
          "We could not complete this step. Please try again or contact Nikki.",
      });
  },
);
