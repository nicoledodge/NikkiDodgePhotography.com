import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { CalendarEvent, CalendarEventStatus, CalendarFeed, CalendarSnapshot, Lead, LeadStatus, MediaFolderCreateResult } from "./shared/crm.js";
import { mergeSiteSettings } from "./shared/siteSettings.js";
import { requireAdmin } from "./server/auth.js";
import { toNodeHandler } from "better-auth/node";
import { auth, authOrigin, sameOriginMutation } from "./server/booking/auth.js";
import { bookingRouter } from "./server/booking/router.js";
import { handleStripeWebhook } from "./server/booking/payments.js";
import { processBookingJobs } from "./server/booking/worker.js";
import { withScheduleLock, assertNoReservationConflict, bookingCalendarEvents } from "./server/booking/service.js";
import { config, isS3Enabled } from "./server/config.js";
import { getNotificationStatus, sendDiscordTestNotification, sendLeadCreatedNotification } from "./server/notifications.js";
import { importCalendarFeeds, normalizeCalendarFeedUrl } from "./server/calendarFeeds.js";
import { storage } from "./server/storage.js";

const app = express();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: config.maxUploadBytes,
    },
});

const leadStatuses: LeadStatus[] = ["new", "contacted", "booked", "archived"];
const calendarStatuses: CalendarEventStatus[] = ["tentative", "confirmed", "completed", "cancelled"];

function asyncHandler(
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
    return (req: Request, res: Response, next: NextFunction) => {
        void handler(req, res, next).catch(next);
    };
}

function trimText(input: unknown, fallback = ""): string {
    return typeof input === "string" ? input.trim() : fallback;
}

function isLeadStatus(value: string): value is LeadStatus {
    return leadStatuses.includes(value as LeadStatus);
}

function isCalendarStatus(value: string): value is CalendarEventStatus {
    return calendarStatuses.includes(value as CalendarEventStatus);
}

function normalizeLeadInput(payload: Partial<Lead>): Omit<Lead, "id" | "createdAt" | "updatedAt" | "status" | "source" | "notes"> {
    return {
        name: trimText(payload.name),
        telephone: trimText(payload.telephone),
        email: trimText(payload.email),
        subject: trimText(payload.subject, "Photography Inquiry") || "Photography Inquiry",
        message: trimText(payload.message),
    };
}

function normalizeCalendarInput(payload: Partial<CalendarEvent>): Omit<CalendarEvent, "id" | "createdAt" | "updatedAt"> {
    return {
        title: trimText(payload.title),
        clientName: trimText(payload.clientName),
        start: trimText(payload.start),
        end: trimText(payload.end),
        location: trimText(payload.location),
        status: isCalendarStatus(trimText(payload.status, "tentative")) ? trimText(payload.status, "tentative") as CalendarEventStatus : "tentative",
        notes: trimText(payload.notes),
    };
}

function validateLeadPayload(payload: ReturnType<typeof normalizeLeadInput>): string | null {
    if (!payload.name || !payload.telephone || !payload.email || !payload.message) {
        return "Name, phone, email, and message are required.";
    }

    if (!payload.email.includes("@")) {
        return "A valid email address is required.";
    }

    return null;
}

function validateCalendarPayload(payload: ReturnType<typeof normalizeCalendarInput>): string | null {
    if (!payload.title || !payload.start || !payload.end) {
        return "Title, start, and end are required.";
    }

    const startTime = Date.parse(payload.start);
    const endTime = Date.parse(payload.end);
    if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
        return "Start and end must be valid dates.";
    }

    if (endTime < startTime) {
        return "End must be after start.";
    }

    return null;
}

function getCalendarFeedName(name: unknown, url: string): string {
    const requestedName = trimText(name);
    if (requestedName) {
        return requestedName;
    }

    return new URL(url).hostname || "iCal feed";
}

app.set("trust proxy", 1);
app.use((req, res, next) => {
    // Keep OAuth callbacks, cookies and mutation origins on the canonical site.
    if (config.isProduction && req.get("host")?.split(":")[0] === "www.nikkidodgephotography.com"
        && new URL(authOrigin).hostname === "nikkidodgephotography.com") {
        res.redirect(308, `${authOrigin}${req.originalUrl}`); return;
    }
    next();
});
// Auth and Stripe must receive the original request stream.
if (auth) app.all("/api/auth/*", toNodeHandler(auth));
else app.all("/api/auth/*", (_req, res) => { res.status(503).json({ error: "Social sign-in is being configured." }); });
app.post("/api/stripe/webhook", express.raw({ type: "application/json", limit: "1mb" }), asyncHandler(async (req, res) => {
    const signature = req.get("stripe-signature");
    if (!signature) { res.status(400).json({ error: "Missing webhook signature." }); return; }
    try { await handleStripeWebhook(req.body as Buffer, signature); res.json({ received: true }); }
    catch (error) { console.error("Stripe webhook failed", error instanceof Error ? error.name : "UnknownError"); res.status((error as {statusCode?:number}).statusCode || 500).json({error:"Webhook could not be processed."}); }
}));
app.use(express.json({ limit: "2mb" }));
app.use("/api/booking", bookingRouter);
app.use("/api/admin", sameOriginMutation);
app.use(express.urlencoded({ extended: true }));

if (!isS3Enabled) {
    app.use(config.localUploadPath, express.static(config.localMediaDir));
}

app.get("/api/health", (_req, res) => {
    res.json({
        ok: true,
        storage: isS3Enabled ? "s3" : "local",
    });
});

app.get("/api/public/settings", asyncHandler(async (_req, res) => {
    const settings = await storage.getSettings();
    res.json(settings);
}));

app.post("/api/public/inquiries", asyncHandler(async (req, res) => {
    const normalizedPayload = normalizeLeadInput(req.body as Partial<Lead>);
    const validationError = validateLeadPayload(normalizedPayload);
    if (validationError) {
        res.status(400).json({ error: validationError });
        return;
    }

    const now = new Date().toISOString();
    const nextLead: Lead = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        status: "new",
        source: "website",
        notes: "",
        ...normalizedPayload,
    };

    const leads = await storage.getLeads();
    leads.unshift(nextLead);
    await storage.saveLeads(leads);
    void sendLeadCreatedNotification(nextLead).catch((error: unknown) => {
        console.error("Discord lead notification failed:", error);
    });

    res.status(201).json({
        ok: true,
        lead: nextLead,
    });
}));

app.get("/api/admin/leads", requireAdmin, asyncHandler(async (_req, res) => {
    const leads = await storage.getLeads();
    res.json(leads);
}));

app.patch("/api/admin/leads/:id", requireAdmin, asyncHandler(async (req, res) => {
    const leadId = trimText(req.params.id);
    const leads = await storage.getLeads();
    const index = leads.findIndex((lead) => lead.id === leadId);

    if (index === -1) {
        res.status(404).json({ error: "Lead not found." });
        return;
    }

    const currentLead = leads[index];
    const requestedStatus = trimText(req.body.status, currentLead.status);
    const nextStatus = isLeadStatus(requestedStatus) ? requestedStatus : currentLead.status;

    const nextLead: Lead = {
        ...currentLead,
        status: nextStatus,
        notes: trimText(req.body.notes, currentLead.notes),
        updatedAt: new Date().toISOString(),
    };

    leads[index] = nextLead;
    await storage.saveLeads(leads);
    res.json(nextLead);
}));

app.get("/api/admin/calendar", requireAdmin, asyncHandler(async (_req, res) => {
    const [events, feeds] = await Promise.all([
        storage.getCalendar(),
        storage.getCalendarFeeds(),
    ]);

    const importResult = feeds.length > 0
        ? await importCalendarFeeds(feeds)
        : { feeds, importedEvents: [] };

    if (feeds.length > 0) {
        await storage.saveCalendarFeeds(importResult.feeds);
    }

    const snapshot: CalendarSnapshot = {
        events: [...events, ...await bookingCalendarEvents()],
        importedEvents: importResult.importedEvents,
        feeds: importResult.feeds,
    };

    res.json(snapshot);
}));

app.post("/api/admin/calendar", requireAdmin, asyncHandler(async (req, res) => {
    await withScheduleLock(async (scheduleDb) => {
    const normalizedPayload = normalizeCalendarInput(req.body as Partial<CalendarEvent>);
    const validationError = validateCalendarPayload(normalizedPayload);
    if (validationError) {
        res.status(400).json({ error: validationError });
        return;
    }

    if (normalizedPayload.status !== "cancelled") await assertNoReservationConflict(normalizedPayload.start, normalizedPayload.end, scheduleDb);

    const now = new Date().toISOString();
    const nextEvent: CalendarEvent = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...normalizedPayload,
    };

    const events = await storage.getCalendar();
    events.push(nextEvent);
    await storage.saveCalendar(events);
    res.status(201).json(nextEvent);
    });
}));

app.patch("/api/admin/calendar/:id", requireAdmin, asyncHandler(async (req, res) => {
    await withScheduleLock(async (scheduleDb) => {
    const eventId = trimText(req.params.id);
    const events = await storage.getCalendar();
    const index = events.findIndex((event) => event.id === eventId);

    if (index === -1) {
        res.status(404).json({ error: "Calendar event not found." });
        return;
    }

    const normalizedPayload = normalizeCalendarInput({
        ...events[index],
        ...req.body,
    } as Partial<CalendarEvent>);
    const validationError = validateCalendarPayload(normalizedPayload);
    if (validationError) {
        res.status(400).json({ error: validationError });
        return;
    }

    if (normalizedPayload.status !== "cancelled") await assertNoReservationConflict(normalizedPayload.start, normalizedPayload.end, scheduleDb);

    const nextEvent: CalendarEvent = {
        ...events[index],
        ...normalizedPayload,
        updatedAt: new Date().toISOString(),
    };

    events[index] = nextEvent;
    await storage.saveCalendar(events);
    res.json(nextEvent);
    });
}));

app.delete("/api/admin/calendar/:id", requireAdmin, asyncHandler(async (req, res) => {
    await withScheduleLock(async () => {
    const eventId = trimText(req.params.id);
    const events = await storage.getCalendar();
    const nextEvents = events.filter((event) => event.id !== eventId);

    if (nextEvents.length === events.length) {
        res.status(404).json({ error: "Calendar event not found." });
        return;
    }

    await storage.saveCalendar(nextEvents);
    res.status(204).end();
    });
}));

app.post("/api/admin/calendar/feeds", requireAdmin, asyncHandler(async (req, res) => {
    const url = normalizeCalendarFeedUrl(req.body.url);
    if (!url) {
        res.status(400).json({ error: "A valid http, https, or webcal iCal URL is required." });
        return;
    }

    const feeds = await storage.getCalendarFeeds();
    const duplicateFeed = feeds.find((feed) => feed.url === url);
    if (duplicateFeed) {
        res.status(409).json({ error: "That iCal link is already saved." });
        return;
    }

    const now = new Date().toISOString();
    const nextFeed: CalendarFeed = {
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
        name: getCalendarFeedName(req.body.name, url),
        url,
        lastFetchedAt: "",
        lastError: "",
    };

    feeds.push(nextFeed);
    await storage.saveCalendarFeeds(feeds);
    res.status(201).json(nextFeed);
}));

app.delete("/api/admin/calendar/feeds/:id", requireAdmin, asyncHandler(async (req, res) => {
    const feedId = trimText(req.params.id);
    const feeds = await storage.getCalendarFeeds();
    const nextFeeds = feeds.filter((feed) => feed.id !== feedId);

    if (nextFeeds.length === feeds.length) {
        res.status(404).json({ error: "iCal link not found." });
        return;
    }

    await storage.saveCalendarFeeds(nextFeeds);
    res.status(204).end();
}));

app.get("/api/admin/settings", requireAdmin, asyncHandler(async (_req, res) => {
    const settings = await storage.getSettings();
    res.json(settings);
}));

app.get("/api/admin/notifications/status", requireAdmin, (_req, res) => {
    res.json(getNotificationStatus());
});

app.post("/api/admin/notifications/test", requireAdmin, asyncHandler(async (_req, res) => {
    const sent = await sendDiscordTestNotification();
    if (!sent) {
        res.status(400).json({ error: "Discord webhook is not configured." });
        return;
    }

    res.json({ ok: true });
}));

app.put("/api/admin/settings", requireAdmin, asyncHandler(async (req, res) => {
    const settings = mergeSiteSettings(req.body);
    await storage.saveSettings(settings);
    res.json(settings);
}));

app.get("/api/admin/media", requireAdmin, asyncHandler(async (req, res) => {
    const prefix = trimText(req.query.prefix);
    const items = await storage.listMedia(prefix);
    res.json(items);
}));

app.post("/api/admin/media/folders", requireAdmin, asyncHandler(async (req, res) => {
    const prefix = trimText(req.body.prefix);

    if (!prefix) {
        res.status(400).json({ error: "A folder name is required." });
        return;
    }

    const folder: MediaFolderCreateResult = await storage.createMediaFolder(prefix);
    res.status(201).json(folder);
}));

app.post("/api/admin/media/upload-target", requireAdmin, asyncHandler(async (req, res) => {
    const fileName = trimText(req.body.fileName);
    const contentType = trimText(req.body.contentType, "application/octet-stream") || "application/octet-stream";
    const prefix = trimText(req.body.prefix);
    const size = Number(req.body.size);
    const maxBytes = isS3Enabled ? config.maxDirectUploadBytes : config.maxServerUploadBytes;

    if (!fileName) {
        res.status(400).json({ error: "A file name is required." });
        return;
    }

    if (!Number.isFinite(size) || size <= 0) {
        res.status(400).json({ error: "A valid file size is required." });
        return;
    }

    if (size > maxBytes) {
        res.status(400).json({ error: `Files must be ${Math.floor(maxBytes / 1024 / 1024)} MB or smaller.` });
        return;
    }

    const uploadTarget = await storage.createMediaUploadTarget({
        fileName,
        contentType,
        size,
        prefix,
    });

    res.status(201).json(uploadTarget);
}));

app.post("/api/admin/media/upload", requireAdmin, upload.single("file"), asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "A file upload is required." });
        return;
    }

    const prefix = trimText(req.body.prefix);
    const uploadedItem = await storage.uploadMedia({
        fileName: req.file.originalname,
        contentType: req.file.mimetype,
        buffer: req.file.buffer,
        prefix,
    });

    res.status(201).json(uploadedItem);
}));

app.post("/api/admin/media/move", requireAdmin, asyncHandler(async (req, res) => {
    const key = trimText(req.body.key);
    const prefix = trimText(req.body.prefix);

    if (!key) {
        res.status(400).json({ error: "A media key is required." });
        return;
    }

    const movedItem = await storage.moveMedia({
        key,
        prefix,
    });

    res.json(movedItem);
}));

app.delete("/api/admin/media", requireAdmin, asyncHandler(async (req, res) => {
    const key = trimText(req.query.key);
    if (!key) {
        res.status(400).json({ error: "A media key is required." });
        return;
    }

    await storage.deleteMedia(key);
    res.status(204).end();
}));

const indexFilePath = resolve(config.distDir, "index.html");
const distAvailable = existsSync(indexFilePath);

if (distAvailable) {
    app.use(express.static(config.distDir, { index: false }));
    app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => {
        res.sendFile(indexFilePath);
    });
} else {
    app.get("/", (_req, res) => {
        res.type("text/plain").send("Nikki Dodge Photography CRM API is running.");
    });
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);

    if (error instanceof multer.MulterError) {
        res.status(400).json({ error: error.message });
        return;
    }

    const status = (error as {statusCode?:number}).statusCode;
    if (status && status >= 400 && status < 500) { res.status(status).json({error: error instanceof Error ? error.message : "Request failed."}); return; }
    res.status(500).json({ error: "We could not complete this request. Please try again." });
});

let workerRunning = false;
if (auth) {
    const interval = setInterval(() => {
        if (workerRunning) return;
        workerRunning = true;
        void processBookingJobs().catch(() => console.error("Booking background processing failed")).finally(() => { workerRunning = false; });
    }, 15000);
    interval.unref();
}
app.listen(config.port, () => {
    console.log(`Server listening on http://0.0.0.0:${config.port}`);
});
