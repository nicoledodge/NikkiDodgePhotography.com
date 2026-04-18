import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { CalendarEvent, CalendarEventStatus, Lead, LeadStatus } from "./shared/crm.js";
import { mergeSiteSettings } from "./shared/siteSettings.js";
import { clearSessionCookie, createSessionToken, isAdminCredentialMatch, readSessionFromRequest, requireAdmin, setSessionCookie } from "./server/auth.js";
import { config, isS3Enabled } from "./server/config.js";
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

app.set("trust proxy", 1);
app.use(express.json({ limit: "2mb" }));
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

    res.status(201).json({
        ok: true,
        lead: nextLead,
    });
}));

app.post("/api/auth/login", (req, res) => {
    const username = trimText(req.body.username);
    const password = trimText(req.body.password);

    if (!isAdminCredentialMatch(username, password)) {
        res.status(401).json({ error: "Invalid username or password." });
        return;
    }

    const token = createSessionToken(username);
    setSessionCookie(req, res, token);

    res.json({
        authenticated: true,
        username: config.adminUsername,
    });
});

app.post("/api/auth/logout", (req, res) => {
    clearSessionCookie(req, res);
    res.json({ authenticated: false });
});

app.get("/api/auth/session", (req, res) => {
    const session = readSessionFromRequest(req);
    if (!session) {
        res.json({ authenticated: false });
        return;
    }

    res.json({
        authenticated: true,
        username: session.sub,
    });
});

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
    const events = await storage.getCalendar();
    res.json(events);
}));

app.post("/api/admin/calendar", requireAdmin, asyncHandler(async (req, res) => {
    const normalizedPayload = normalizeCalendarInput(req.body as Partial<CalendarEvent>);
    const validationError = validateCalendarPayload(normalizedPayload);
    if (validationError) {
        res.status(400).json({ error: validationError });
        return;
    }

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
}));

app.patch("/api/admin/calendar/:id", requireAdmin, asyncHandler(async (req, res) => {
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

    const nextEvent: CalendarEvent = {
        ...events[index],
        ...normalizedPayload,
        updatedAt: new Date().toISOString(),
    };

    events[index] = nextEvent;
    await storage.saveCalendar(events);
    res.json(nextEvent);
}));

app.delete("/api/admin/calendar/:id", requireAdmin, asyncHandler(async (req, res) => {
    const eventId = trimText(req.params.id);
    const events = await storage.getCalendar();
    const nextEvents = events.filter((event) => event.id !== eventId);

    if (nextEvents.length === events.length) {
        res.status(404).json({ error: "Calendar event not found." });
        return;
    }

    await storage.saveCalendar(nextEvents);
    res.status(204).end();
}));

app.get("/api/admin/settings", requireAdmin, asyncHandler(async (_req, res) => {
    const settings = await storage.getSettings();
    res.json(settings);
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

    const message = error instanceof Error ? error.message : "Unexpected server error.";
    res.status(500).json({ error: message });
});

app.listen(config.port, () => {
    console.log(`Server listening on http://0.0.0.0:${config.port}`);
});
