import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { CalendarEvent, Lead, MediaItem, MediaUploadTarget } from "../shared/crm.js";
import { defaultSiteSettings, type SiteSettings } from "../shared/siteSettings.js";
import { useSiteSettings } from "../site/SiteSettingsContext";

type AdminTab = "leads" | "calendar" | "media" | "settings";

interface SessionResponse {
    authenticated: boolean;
    username?: string;
}

interface CalendarDraft {
    title: string;
    clientName: string;
    start: string;
    end: string;
    location: string;
    status: CalendarEvent["status"];
    notes: string;
}

interface NotificationStatus {
    discordEnabled: boolean;
    publicAppUrl: string;
}

interface MediaFolder {
    name: string;
    prefix: string;
    count: number;
}

interface UploadProgressEntry {
    fileName: string;
    status: "waiting" | "signing" | "uploading" | "complete" | "error";
    message?: string;
}

const tabLabels: Record<AdminTab, string> = {
    leads: "Leads",
    calendar: "Calendar",
    media: "Media",
    settings: "Site Settings",
};

const settingsFields: Array<{
    key: keyof SiteSettings;
    label: string;
    multiline?: boolean;
    help?: string;
}> = [
    { key: "businessName", label: "Business Name" },
    { key: "logoUrl", label: "Logo URL", help: "Paste a public media URL after upload." },
    { key: "profilePhotoUrl", label: "Profile Photo URL", help: "Used on the contact page." },
    { key: "contactEmail", label: "Contact Email" },
    { key: "contactPhone", label: "Contact Phone" },
    { key: "serviceArea", label: "Service Area" },
    { key: "heroTitle", label: "Home Hero Title", help: "Use *asterisks* around words that should stay emphasized." },
    { key: "heroBody", label: "Home Hero Body", multiline: true },
    { key: "heroPrimaryCtaLabel", label: "Hero Primary Button" },
    { key: "heroSecondaryCtaLabel", label: "Hero Secondary Button" },
    { key: "homeAboutTitle", label: "Home About Title", help: "Use *asterisks* around words that should stay emphasized." },
    { key: "homeAboutBody", label: "Home About Body", multiline: true },
    { key: "homeAvailabilityCtaLabel", label: "Home About Button" },
    { key: "aboutPageTitle", label: "About Page Title", help: "Use *asterisks* around words that should stay emphasized." },
    { key: "aboutPageBody", label: "About Page Body", multiline: true },
    { key: "profileName", label: "Profile Name" },
    { key: "profileRole", label: "Profile Role", multiline: true },
    { key: "pricingPageTitle", label: "Pricing Page Title", help: "Use *asterisks* around words that should stay emphasized." },
    { key: "pricingPageBody", label: "Pricing Page Body", multiline: true },
    { key: "pricingPageCtaLabel", label: "Pricing CTA Label" },
    { key: "contactPageTitle", label: "Contact Page Title", help: "Use *asterisks* around words that should stay emphasized." },
    { key: "contactPageBody", label: "Contact Page Body", multiline: true },
    { key: "inquirySectionEyebrow", label: "Inquiry Eyebrow" },
    { key: "inquirySectionTitle", label: "Inquiry Title", multiline: true },
];

const colorFields: Array<{ key: keyof SiteSettings; label: string }> = [
    { key: "primaryColor", label: "Primary Color" },
    { key: "secondaryColor", label: "Background Color" },
    { key: "accentColor", label: "Accent Color" },
    { key: "buttonColor", label: "Button Color" },
    { key: "darkBackgroundColor", label: "Dark Background Color" },
    { key: "highlightColor", label: "Highlight Color" },
];

const initialCalendarDraft: CalendarDraft = {
    title: "",
    clientName: "",
    start: "",
    end: "",
    location: "",
    status: "tentative",
    notes: "",
};

function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
}

function buildCalendarGrid(visibleMonth: Date): Date[] {
    const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const startOfGrid = addDays(firstOfMonth, -firstOfMonth.getDay());
    return Array.from({ length: 42 }, (_, index) => addDays(startOfGrid, index));
}

function toDateTimeInputValue(value: string): string {
    if (!value) {
        return "";
    }

    const date = new Date(value);
    const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return shifted.toISOString().slice(0, 16);
}

function parseApiError(body: unknown, status: number): string {
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
        return body.error;
    }

    return `Request failed with status ${status}.`;
}

function normalizeMediaPrefix(input: string): string {
    return input
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")
        .replace(/\/+$/, "")
        .split("/")
        .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..")
        .join("/");
}

function joinMediaPrefix(parentPrefix: string, childPrefix: string): string {
    return [normalizeMediaPrefix(parentPrefix), normalizeMediaPrefix(childPrefix)]
        .filter(Boolean)
        .join("/");
}

function getParentMediaPrefix(relativeKey: string): string {
    const segments = normalizeMediaPrefix(relativeKey).split("/").filter(Boolean);
    segments.pop();
    return segments.join("/");
}

function getMediaBreadcrumbs(prefix: string): MediaFolder[] {
    const segments = normalizeMediaPrefix(prefix).split("/").filter(Boolean);
    const folders: MediaFolder[] = [{ name: "site-assets", prefix: "", count: 0 }];
    let currentPrefix = "";

    for (const segment of segments) {
        currentPrefix = joinMediaPrefix(currentPrefix, segment);
        folders.push({
            name: segment,
            prefix: currentPrefix,
            count: 0,
        });
    }

    return folders;
}

function getImmediateMediaListing(items: MediaItem[], prefix: string): { folders: MediaFolder[]; files: MediaItem[] } {
    const normalizedPrefix = normalizeMediaPrefix(prefix);
    const prefixWithSlash = normalizedPrefix ? `${normalizedPrefix}/` : "";
    const folderMap = new Map<string, MediaFolder>();
    const files: MediaItem[] = [];

    for (const item of items) {
        let relativeKey = normalizeMediaPrefix(item.relativeKey);

        if (normalizedPrefix) {
            if (!relativeKey.startsWith(prefixWithSlash)) {
                continue;
            }

            relativeKey = relativeKey.slice(prefixWithSlash.length);
        }

        const [firstSegment, ...remainingSegments] = relativeKey.split("/").filter(Boolean);
        if (!firstSegment) {
            continue;
        }

        if (remainingSegments.length > 0) {
            const folderPrefix = joinMediaPrefix(normalizedPrefix, firstSegment);
            const existingFolder = folderMap.get(folderPrefix);
            folderMap.set(folderPrefix, {
                name: firstSegment,
                prefix: folderPrefix,
                count: (existingFolder?.count ?? 0) + 1,
            });
            continue;
        }

        files.push(item);
    }

    return {
        folders: [...folderMap.values()].sort((left, right) => left.name.localeCompare(right.name)),
        files: files.sort((left, right) => right.relativeKey.localeCompare(left.relativeKey)),
    };
}

function formatBytes(size: number): string {
    if (size < 1024) {
        return `${size} B`;
    }

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    const isFormData = init?.body instanceof FormData;
    if (!isFormData && init?.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
        credentials: "same-origin",
        ...init,
        headers,
    });

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) as unknown : null;

    if (!response.ok) {
        throw new Error(parseApiError(data, response.status));
    }

    return data as T;
}

async function requestVoid(url: string, init?: RequestInit): Promise<void> {
    await request<unknown>(url, init);
}

function monthHeading(visibleMonth: Date): string {
    return visibleMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });
}

export default function Admin() {
    const { reloadSiteSettings } = useSiteSettings();
    const [sessionChecked, setSessionChecked] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);
    const [username, setUsername] = useState("");
    const [loginForm, setLoginForm] = useState({ username: "admin", password: "" });
    const [loginError, setLoginError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<AdminTab>("leads");
    const [notice, setNotice] = useState<string | null>(null);
    const [dashboardError, setDashboardError] = useState<string | null>(null);
    const [loadingDashboard, setLoadingDashboard] = useState(false);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [settingsDraft, setSettingsDraft] = useState<SiteSettings>(defaultSiteSettings);
    const [notificationStatus, setNotificationStatus] = useState<NotificationStatus | null>(null);
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [mediaPrefix, setMediaPrefix] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [newFolderName, setNewFolderName] = useState("");
    const [moveDrafts, setMoveDrafts] = useState<Record<string, string>>({});
    const [movingMediaKey, setMovingMediaKey] = useState<string | null>(null);
    const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
    const [savingSettings, setSavingSettings] = useState(false);
    const [sendingDiscordTest, setSendingDiscordTest] = useState(false);
    const [savingEvent, setSavingEvent] = useState(false);
    const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [calendarDraft, setCalendarDraft] = useState<CalendarDraft>(initialCalendarDraft);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<UploadProgressEntry[]>([]);
    const [visibleMonth, setVisibleMonth] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });

    const loadMedia = useCallback(async (prefix: string) => {
        const normalizedPrefix = normalizeMediaPrefix(prefix);
        const params = normalizedPrefix.length > 0
            ? `?prefix=${encodeURIComponent(normalizedPrefix)}`
            : "";
        const nextMediaItems = await request<MediaItem[]>(`/api/admin/media${params}`);
        setMediaItems(nextMediaItems);
        setMediaPrefix(normalizedPrefix);
    }, []);

    const loadDashboard = useCallback(async () => {
        setLoadingDashboard(true);
        setDashboardError(null);

        try {
            const [nextLeads, nextCalendar, nextSettings, nextNotificationStatus] = await Promise.all([
                request<Lead[]>("/api/admin/leads"),
                request<CalendarEvent[]>("/api/admin/calendar"),
                request<SiteSettings>("/api/admin/settings"),
                request<NotificationStatus>("/api/admin/notifications/status"),
            ]);

            setLeads(nextLeads);
            setCalendarEvents(nextCalendar);
            setSettingsDraft(nextSettings);
            setNotificationStatus(nextNotificationStatus);
            await loadMedia("");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load the CRM.";
            setDashboardError(message);
        } finally {
            setLoadingDashboard(false);
        }
    }, [loadMedia]);

    useEffect(() => {
        void (async () => {
            try {
                const session = await request<SessionResponse>("/api/auth/session");
                if (session.authenticated) {
                    setAuthenticated(true);
                    setUsername(session.username ?? "admin");
                    await loadDashboard();
                }
            } catch {
                setAuthenticated(false);
            } finally {
                setSessionChecked(true);
            }
        })();
    }, [loadDashboard]);

    const calendarEventsByDay = useMemo(() => {
        const entries = new Map<string, CalendarEvent[]>();

        for (const event of calendarEvents) {
            const key = formatDateKey(new Date(event.start));
            const dayEvents = entries.get(key) ?? [];
            dayEvents.push(event);
            dayEvents.sort((left, right) => left.start.localeCompare(right.start));
            entries.set(key, dayEvents);
        }

        return entries;
    }, [calendarEvents]);

    const visibleDays = useMemo(() => buildCalendarGrid(visibleMonth), [visibleMonth]);
    const upcomingEvents = useMemo(() => (
        [...calendarEvents].sort((left, right) => left.start.localeCompare(right.start))
    ), [calendarEvents]);
    const leadCounts = useMemo(() => ({
        new: leads.filter((lead) => lead.status === "new").length,
        contacted: leads.filter((lead) => lead.status === "contacted").length,
        booked: leads.filter((lead) => lead.status === "booked").length,
        archived: leads.filter((lead) => lead.status === "archived").length,
    }), [leads]);
    const mediaListing = useMemo(() => getImmediateMediaListing(mediaItems, mediaPrefix), [mediaItems, mediaPrefix]);
    const mediaBreadcrumbs = useMemo(() => getMediaBreadcrumbs(mediaPrefix), [mediaPrefix]);
    const selectedFileSummary = useMemo(() => {
        const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
        return {
            count: selectedFiles.length,
            totalBytes,
        };
    }, [selectedFiles]);

    const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoginError(null);

        try {
            const response = await request<SessionResponse>("/api/auth/login", {
                method: "POST",
                body: JSON.stringify(loginForm),
            });

            setAuthenticated(response.authenticated);
            setUsername(response.username ?? (loginForm.username.trim() || "admin"));
            setSessionChecked(true);
            setNotice("Signed in.");
            await loadDashboard();
        } catch (error) {
            setLoginError(error instanceof Error ? error.message : "Unable to sign in.");
        }
    };

    const handleLogout = async () => {
        await request<SessionResponse>("/api/auth/logout", {
            method: "POST",
        });

        setAuthenticated(false);
        setUsername("");
        setLeads([]);
        setCalendarEvents([]);
        setMediaItems([]);
        setSelectedFiles([]);
        setUploadProgress([]);
        setMoveDrafts({});
        setNotice("Signed out.");
    };

    const handleLeadFieldChange = (leadId: string, field: "status" | "notes", value: string) => {
        setLeads((currentLeads) => currentLeads.map((lead) => (
            lead.id === leadId
                ? {
                    ...lead,
                    [field]: value,
                }
                : lead
        )));
    };

    const saveLead = async (lead: Lead) => {
        setSavingLeadId(lead.id);
        setNotice(null);

        try {
            const nextLead = await request<Lead>(`/api/admin/leads/${lead.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    status: lead.status,
                    notes: lead.notes,
                }),
            });

            setLeads((currentLeads) => currentLeads.map((currentLead) => (
                currentLead.id === nextLead.id ? nextLead : currentLead
            )));
            setNotice(`Saved ${lead.name}'s lead record.`);
        } catch (error) {
            setDashboardError(error instanceof Error ? error.message : "Unable to save lead.");
        } finally {
            setSavingLeadId(null);
        }
    };

    const resetCalendarForm = () => {
        setEditingEventId(null);
        setCalendarDraft(initialCalendarDraft);
    };

    const startEditingEvent = (event: CalendarEvent) => {
        setEditingEventId(event.id);
        setCalendarDraft({
            title: event.title,
            clientName: event.clientName,
            start: toDateTimeInputValue(event.start),
            end: toDateTimeInputValue(event.end),
            location: event.location,
            status: event.status,
            notes: event.notes,
        });
    };

    const saveCalendarEvent = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSavingEvent(true);
        setDashboardError(null);

        try {
            const payload = {
                ...calendarDraft,
                start: new Date(calendarDraft.start).toISOString(),
                end: new Date(calendarDraft.end).toISOString(),
            };

            if (editingEventId) {
                const updatedEvent = await request<CalendarEvent>(`/api/admin/calendar/${editingEventId}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                });

                setCalendarEvents((currentEvents) => currentEvents.map((currentEvent) => (
                    currentEvent.id === updatedEvent.id ? updatedEvent : currentEvent
                )));
                setNotice("Calendar event updated.");
            } else {
                const createdEvent = await request<CalendarEvent>("/api/admin/calendar", {
                    method: "POST",
                    body: JSON.stringify(payload),
                });

                setCalendarEvents((currentEvents) => [...currentEvents, createdEvent]);
                setNotice("Calendar event created.");
            }

            resetCalendarForm();
        } catch (error) {
            setDashboardError(error instanceof Error ? error.message : "Unable to save calendar event.");
        } finally {
            setSavingEvent(false);
        }
    };

    const deleteCalendarEvent = async (eventId: string) => {
        if (!window.confirm("Delete this calendar event?")) {
            return;
        }

        setDeletingEventId(eventId);
        setDashboardError(null);

        try {
            await requestVoid(`/api/admin/calendar/${eventId}`, {
                method: "DELETE",
            });
            setCalendarEvents((currentEvents) => currentEvents.filter((event) => event.id !== eventId));
            if (editingEventId === eventId) {
                resetCalendarForm();
            }
            setNotice("Calendar event deleted.");
        } catch (error) {
            setDashboardError(error instanceof Error ? error.message : "Unable to delete calendar event.");
        } finally {
            setDeletingEventId(null);
        }
    };

    const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSavingSettings(true);
        setDashboardError(null);

        try {
            const nextSettings = await request<SiteSettings>("/api/admin/settings", {
                method: "PUT",
                body: JSON.stringify(settingsDraft),
            });

            setSettingsDraft(nextSettings);
            await reloadSiteSettings();
            setNotice("Site settings saved.");
        } catch (error) {
            setDashboardError(error instanceof Error ? error.message : "Unable to save settings.");
        } finally {
            setSavingSettings(false);
        }
    };

    const sendDiscordTest = async () => {
        setSendingDiscordTest(true);
        setDashboardError(null);

        try {
            await request<{ ok: true }>("/api/admin/notifications/test", {
                method: "POST",
            });
            setNotice("Discord test notification sent.");
        } catch (error) {
            setDashboardError(error instanceof Error ? error.message : "Unable to send Discord test notification.");
        } finally {
            setSendingDiscordTest(false);
        }
    };

    const openMediaFolder = async (prefix: string) => {
        setDashboardError(null);
        setMoveDrafts({});

        try {
            await loadMedia(prefix);
        } catch (error) {
            setDashboardError(error instanceof Error ? error.message : "Unable to load media.");
        }
    };

    const openNewMediaFolder = async () => {
        const nextFolderPrefix = joinMediaPrefix(mediaPrefix, newFolderName);
        if (!nextFolderPrefix) {
            setDashboardError("Enter a folder name first.");
            return;
        }

        setNewFolderName("");
        await openMediaFolder(nextFolderPrefix);
    };

    const setUploadEntry = (index: number, update: Partial<UploadProgressEntry>) => {
        setUploadProgress((currentProgress) => currentProgress.map((entry, entryIndex) => (
            entryIndex === index
                ? {
                    ...entry,
                    ...update,
                }
                : entry
        )));
    };

    const uploadFile = async (file: File, prefix: string, index: number) => {
        try {
            setUploadEntry(index, { status: "signing", message: "Preparing secure upload" });
            const contentType = file.type || "application/octet-stream";
            const uploadTarget = await request<MediaUploadTarget>("/api/admin/media/upload-target", {
                method: "POST",
                body: JSON.stringify({
                    fileName: file.name,
                    contentType,
                    size: file.size,
                    prefix,
                }),
            });

            if (uploadTarget.method === "s3") {
                setUploadEntry(index, { status: "uploading", message: "Uploading to S3" });
                const response = await fetch(uploadTarget.uploadUrl, {
                    method: "PUT",
                    headers: uploadTarget.headers,
                    body: file,
                });

                if (!response.ok) {
                    throw new Error(`S3 rejected ${file.name} with status ${response.status}.`);
                }

                setUploadEntry(index, { status: "complete", message: uploadTarget.relativeKey });
                return;
            }

            setUploadEntry(index, { status: "uploading", message: "Uploading through the local server" });
            const formData = new FormData();
            formData.append("file", file);
            formData.append("prefix", prefix);
            await request<MediaItem>(uploadTarget.uploadUrl, {
                method: "POST",
                body: formData,
            });
            setUploadEntry(index, { status: "complete", message: file.name });
        } catch (error) {
            setUploadEntry(index, {
                status: "error",
                message: error instanceof Error ? error.message : "Upload failed.",
            });
            throw error;
        }
    };

    const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (selectedFiles.length === 0) {
            setDashboardError("Choose at least one file before uploading.");
            return;
        }

        const uploadPrefix = normalizeMediaPrefix(mediaPrefix);
        setUploading(true);
        setDashboardError(null);
        setNotice(null);
        setUploadProgress(selectedFiles.map((file) => ({
            fileName: file.name,
            status: "waiting",
        })));

        try {
            for (const [index, file] of selectedFiles.entries()) {
                await uploadFile(file, uploadPrefix, index);
            }

            setSelectedFiles([]);
            setFileInputKey((currentKey) => currentKey + 1);
            await loadMedia(uploadPrefix);
            setNotice(`Uploaded ${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"}.`);
        } catch (error) {
            setDashboardError(error instanceof Error ? error.message : "Unable to upload media.");
        } finally {
            setUploading(false);
        }
    };

    const moveMedia = async (item: MediaItem) => {
        const destinationPrefix = normalizeMediaPrefix(moveDrafts[item.key] ?? getParentMediaPrefix(item.relativeKey));
        setMovingMediaKey(item.key);
        setDashboardError(null);

        try {
            await request<MediaItem>("/api/admin/media/move", {
                method: "POST",
                body: JSON.stringify({
                    key: item.key,
                    prefix: destinationPrefix,
                }),
            });
            setMoveDrafts((currentDrafts) => {
                const nextDrafts = { ...currentDrafts };
                delete nextDrafts[item.key];
                return nextDrafts;
            });
            await loadMedia(mediaPrefix);
            setNotice("Media moved.");
        } catch (error) {
            setDashboardError(error instanceof Error ? error.message : "Unable to move media.");
        } finally {
            setMovingMediaKey(null);
        }
    };

    const deleteMedia = async (key: string) => {
        if (!window.confirm("Delete this media file?")) {
            return;
        }

        try {
            await requestVoid(`/api/admin/media?key=${encodeURIComponent(key)}`, {
                method: "DELETE",
            });
            await loadMedia(mediaPrefix);
            setNotice("Media deleted.");
        } catch (error) {
            setDashboardError(error instanceof Error ? error.message : "Unable to delete media.");
        }
    };

    const copyToClipboard = async (value: string) => {
        await navigator.clipboard.writeText(value);
        setNotice("Copied to clipboard.");
    };

    if (!sessionChecked) {
        return (
            <main className="admin-shell">
                <div className="admin-card admin-login-card">
                    <p className="admin-muted">Loading the CRM...</p>
                </div>
            </main>
        );
    }

    if (!authenticated) {
        return (
            <main className="admin-shell">
                <form className="admin-card admin-login-card" onSubmit={handleLogin}>
                    <div className="admin-header-copy">
                        <p className="admin-kicker">Nikki Dodge Photography</p>
                        <h1>CRM Login</h1>
                        <p className="admin-muted">Sign in to manage leads, dates, media, and site settings.</p>
                    </div>
                    <label>
                        Username
                        <input
                            type="text"
                            value={loginForm.username}
                            onChange={(event) => setLoginForm((currentForm) => ({
                                ...currentForm,
                                username: event.target.value,
                            }))}
                            required
                        />
                    </label>
                    <label>
                        Password
                        <input
                            type="password"
                            value={loginForm.password}
                            onChange={(event) => setLoginForm((currentForm) => ({
                                ...currentForm,
                                password: event.target.value,
                            }))}
                            required
                        />
                    </label>
                    {loginError && <p className="admin-alert admin-alert-error">{loginError}</p>}
                    {notice && <p className="admin-alert admin-alert-success">{notice}</p>}
                    <button className="admin-primary-button" type="submit">Sign In</button>
                </form>
            </main>
        );
    }

    return (
        <main className="admin-shell">
            <div className="admin-app">
                <div className="admin-topbar">
                    <div>
                        <p className="admin-kicker">Signed in as {username}</p>
                        <h1>CRM Dashboard</h1>
                    </div>
                    <button className="admin-secondary-button" type="button" onClick={() => void handleLogout()}>
                        Sign Out
                    </button>
                </div>

                <div className="admin-tab-row">
                    {(Object.keys(tabLabels) as AdminTab[]).map((tab) => (
                        <button
                            key={tab}
                            className={tab === activeTab ? "admin-tab-button is-active" : "admin-tab-button"}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                        >
                            {tabLabels[tab]}
                        </button>
                    ))}
                </div>

                {notice && <p className="admin-alert admin-alert-success">{notice}</p>}
                {dashboardError && <p className="admin-alert admin-alert-error">{dashboardError}</p>}

                {loadingDashboard ? (
                    <div className="admin-card">
                        <p className="admin-muted">Loading CRM data...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === "leads" && (
                            <section className="admin-section">
                                <div className="admin-stat-grid">
                                    <div className="admin-stat-card">
                                        <span>New</span>
                                        <strong>{leadCounts.new}</strong>
                                    </div>
                                    <div className="admin-stat-card">
                                        <span>Contacted</span>
                                        <strong>{leadCounts.contacted}</strong>
                                    </div>
                                    <div className="admin-stat-card">
                                        <span>Booked</span>
                                        <strong>{leadCounts.booked}</strong>
                                    </div>
                                    <div className="admin-stat-card">
                                        <span>Archived</span>
                                        <strong>{leadCounts.archived}</strong>
                                    </div>
                                </div>

                                <div className="admin-card">
                                    {leads.length === 0 ? (
                                        <p className="admin-muted">No inquiries yet.</p>
                                    ) : (
                                        <div className="admin-lead-list">
                                            {leads.map((lead) => (
                                                <article className="admin-lead-card" key={lead.id}>
                                                    <div className="admin-lead-header">
                                                        <div>
                                                            <h2>{lead.name}</h2>
                                                            <p className="admin-muted">
                                                                {new Date(lead.createdAt).toLocaleString()} · {lead.source}
                                                            </p>
                                                        </div>
                                                        <select
                                                            value={lead.status}
                                                            onChange={(event) => handleLeadFieldChange(lead.id, "status", event.target.value)}
                                                        >
                                                            <option value="new">New</option>
                                                            <option value="contacted">Contacted</option>
                                                            <option value="booked">Booked</option>
                                                            <option value="archived">Archived</option>
                                                        </select>
                                                    </div>

                                                    <div className="admin-lead-meta">
                                                        <a href={`mailto:${lead.email}`}>{lead.email}</a>
                                                        <a href={`tel:${lead.telephone}`}>{lead.telephone}</a>
                                                        <span>{lead.subject}</span>
                                                    </div>

                                                    <p>{lead.message}</p>

                                                    <label>
                                                        Internal notes
                                                        <textarea
                                                            value={lead.notes}
                                                            onChange={(event) => handleLeadFieldChange(lead.id, "notes", event.target.value)}
                                                        />
                                                    </label>

                                                    <button
                                                        className="admin-primary-button"
                                                        type="button"
                                                        onClick={() => void saveLead(lead)}
                                                        disabled={savingLeadId === lead.id}
                                                    >
                                                        {savingLeadId === lead.id ? "Saving..." : "Save Lead"}
                                                    </button>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {activeTab === "calendar" && (
                            <section className="admin-calendar-layout">
                                <div className="admin-card">
                                    <div className="admin-calendar-header">
                                        <button
                                            className="admin-secondary-button"
                                            type="button"
                                            onClick={() => setVisibleMonth((currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                                        >
                                            Previous
                                        </button>
                                        <h2>{monthHeading(visibleMonth)}</h2>
                                        <button
                                            className="admin-secondary-button"
                                            type="button"
                                            onClick={() => setVisibleMonth((currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                                        >
                                            Next
                                        </button>
                                    </div>
                                    <div className="admin-calendar-grid">
                                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                            <div className="admin-calendar-day-label" key={day}>{day}</div>
                                        ))}
                                        {visibleDays.map((day) => {
                                            const key = formatDateKey(day);
                                            const eventsForDay = calendarEventsByDay.get(key) ?? [];
                                            const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();

                                            return (
                                                <div
                                                    className={isCurrentMonth ? "admin-calendar-day" : "admin-calendar-day is-muted"}
                                                    key={key}
                                                >
                                                    <span className="admin-calendar-date">{day.getDate()}</span>
                                                    {eventsForDay.slice(0, 3).map((event) => (
                                                        <button
                                                            className="admin-calendar-chip"
                                                            key={event.id}
                                                            type="button"
                                                            onClick={() => startEditingEvent(event)}
                                                        >
                                                            {new Date(event.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} {event.title}
                                                        </button>
                                                    ))}
                                                    {eventsForDay.length > 3 && (
                                                        <span className="admin-muted">+{eventsForDay.length - 3} more</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="admin-stack">
                                    <form className="admin-card admin-form-grid" onSubmit={saveCalendarEvent}>
                                        <div className="admin-section-heading">
                                            <h2>{editingEventId ? "Edit Event" : "Add Event"}</h2>
                                            {editingEventId && (
                                                <button className="admin-secondary-button" type="button" onClick={resetCalendarForm}>
                                                    New Event
                                                </button>
                                            )}
                                        </div>

                                        <label>
                                            Title
                                            <input
                                                type="text"
                                                value={calendarDraft.title}
                                                onChange={(event) => setCalendarDraft((currentDraft) => ({
                                                    ...currentDraft,
                                                    title: event.target.value,
                                                }))}
                                                required
                                            />
                                        </label>
                                        <label>
                                            Client name
                                            <input
                                                type="text"
                                                value={calendarDraft.clientName}
                                                onChange={(event) => setCalendarDraft((currentDraft) => ({
                                                    ...currentDraft,
                                                    clientName: event.target.value,
                                                }))}
                                            />
                                        </label>
                                        <label>
                                            Start
                                            <input
                                                type="datetime-local"
                                                value={calendarDraft.start}
                                                onChange={(event) => setCalendarDraft((currentDraft) => ({
                                                    ...currentDraft,
                                                    start: event.target.value,
                                                }))}
                                                required
                                            />
                                        </label>
                                        <label>
                                            End
                                            <input
                                                type="datetime-local"
                                                value={calendarDraft.end}
                                                onChange={(event) => setCalendarDraft((currentDraft) => ({
                                                    ...currentDraft,
                                                    end: event.target.value,
                                                }))}
                                                required
                                            />
                                        </label>
                                        <label>
                                            Location
                                            <input
                                                type="text"
                                                value={calendarDraft.location}
                                                onChange={(event) => setCalendarDraft((currentDraft) => ({
                                                    ...currentDraft,
                                                    location: event.target.value,
                                                }))}
                                            />
                                        </label>
                                        <label>
                                            Status
                                            <select
                                                value={calendarDraft.status}
                                                onChange={(event) => setCalendarDraft((currentDraft) => ({
                                                    ...currentDraft,
                                                    status: event.target.value as CalendarEvent["status"],
                                                }))}
                                            >
                                                <option value="tentative">Tentative</option>
                                                <option value="confirmed">Confirmed</option>
                                                <option value="completed">Completed</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </label>
                                        <label className="admin-span-2">
                                            Notes
                                            <textarea
                                                value={calendarDraft.notes}
                                                onChange={(event) => setCalendarDraft((currentDraft) => ({
                                                    ...currentDraft,
                                                    notes: event.target.value,
                                                }))}
                                            />
                                        </label>
                                        <button className="admin-primary-button" type="submit" disabled={savingEvent}>
                                            {savingEvent ? "Saving..." : editingEventId ? "Update Event" : "Create Event"}
                                        </button>
                                    </form>

                                    <div className="admin-card">
                                        <div className="admin-section-heading">
                                            <h2>Upcoming</h2>
                                        </div>
                                        {upcomingEvents.length === 0 ? (
                                            <p className="admin-muted">No dates on the calendar yet.</p>
                                        ) : (
                                            <div className="admin-upcoming-list">
                                                {upcomingEvents.map((event) => (
                                                    <article className="admin-upcoming-item" key={event.id}>
                                                        <div>
                                                            <h3>{event.title}</h3>
                                                            <p className="admin-muted">{formatDateTime(event.start)} to {formatDateTime(event.end)}</p>
                                                            {(event.clientName || event.location) && (
                                                                <p>{[event.clientName, event.location].filter(Boolean).join(" · ")}</p>
                                                            )}
                                                        </div>
                                                        <div className="admin-inline-actions">
                                                            <button className="admin-secondary-button" type="button" onClick={() => startEditingEvent(event)}>
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="admin-danger-button"
                                                                type="button"
                                                                onClick={() => void deleteCalendarEvent(event.id)}
                                                                disabled={deletingEventId === event.id}
                                                            >
                                                                {deletingEventId === event.id ? "Deleting..." : "Delete"}
                                                            </button>
                                                        </div>
                                                    </article>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeTab === "media" && (
                            <section className="admin-stack">
                                <div className="admin-card admin-media-workspace">
                                    <div className="admin-section-heading">
                                        <div>
                                            <h2>Secure Upload Space</h2>
                                            <p className="admin-muted">Signed uploads write directly to the configured S3 media prefix after admin login.</p>
                                        </div>
                                        <button
                                            className="admin-secondary-button"
                                            type="button"
                                            onClick={() => void openMediaFolder(mediaPrefix)}
                                        >
                                            Refresh
                                        </button>
                                    </div>

                                    <div className="admin-media-breadcrumbs" aria-label="Current media folder">
                                        {mediaBreadcrumbs.map((folder, index) => (
                                            <React.Fragment key={folder.prefix || "root"}>
                                                {index > 0 && <span>/</span>}
                                                <button
                                                    className="admin-link-button"
                                                    type="button"
                                                    onClick={() => void openMediaFolder(folder.prefix)}
                                                >
                                                    {folder.name}
                                                </button>
                                            </React.Fragment>
                                        ))}
                                    </div>

                                    <div className="admin-form-grid">
                                        <label>
                                            Current folder
                                            <input
                                                type="text"
                                                placeholder="branding or homepage"
                                                value={mediaPrefix}
                                                onChange={(event) => setMediaPrefix(event.target.value)}
                                            />
                                        </label>
                                        <label>
                                            Open or create folder
                                            <div className="admin-input-button-row">
                                                <input
                                                    type="text"
                                                    placeholder="new-gallery"
                                                    value={newFolderName}
                                                    onChange={(event) => setNewFolderName(event.target.value)}
                                                />
                                                <button
                                                    className="admin-secondary-button"
                                                    type="button"
                                                    onClick={() => void openNewMediaFolder()}
                                                >
                                                    Open
                                                </button>
                                            </div>
                                        </label>
                                    </div>

                                    <form className="admin-upload-panel" onSubmit={handleUpload}>
                                        <label>
                                            Files
                                            <input
                                                key={fileInputKey}
                                                type="file"
                                                multiple
                                                onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                                                required
                                            />
                                        </label>
                                        <div className="admin-upload-summary">
                                            <span>
                                                {selectedFileSummary.count === 0
                                                    ? "No files selected"
                                                    : `${selectedFileSummary.count} file${selectedFileSummary.count === 1 ? "" : "s"} selected`}
                                            </span>
                                            {selectedFileSummary.count > 0 && <span>{formatBytes(selectedFileSummary.totalBytes)}</span>}
                                        </div>
                                        <div className="admin-inline-actions">
                                            <button className="admin-primary-button" type="submit" disabled={uploading}>
                                                {uploading ? "Uploading..." : "Upload to S3"}
                                            </button>
                                            <button
                                                className="admin-secondary-button"
                                                type="button"
                                                onClick={() => {
                                                    setSelectedFiles([]);
                                                    setUploadProgress([]);
                                                    setFileInputKey((currentKey) => currentKey + 1);
                                                }}
                                                disabled={uploading || selectedFiles.length === 0}
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </form>

                                    {uploadProgress.length > 0 && (
                                        <div className="admin-upload-progress-list" aria-live="polite">
                                            {uploadProgress.map((entry, index) => (
                                                <div className={`admin-upload-progress-item is-${entry.status}`} key={`${entry.fileName}-${index}`}>
                                                    <strong>{entry.fileName}</strong>
                                                    <span>{entry.message ?? entry.status}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="admin-card">
                                    <div className="admin-section-heading">
                                        <h2>Media Library</h2>
                                        <p className="admin-muted">{mediaPrefix ? `Folder: ${mediaPrefix}` : "Folder: site-assets"}</p>
                                    </div>

                                    {mediaListing.folders.length > 0 && (
                                        <div className="admin-folder-grid">
                                            {mediaListing.folders.map((folder) => (
                                                <button
                                                    className="admin-folder-button"
                                                    type="button"
                                                    key={folder.prefix}
                                                    onClick={() => void openMediaFolder(folder.prefix)}
                                                >
                                                    <span>{folder.name}</span>
                                                    <small>{folder.count} item{folder.count === 1 ? "" : "s"}</small>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {mediaListing.files.length === 0 && mediaListing.folders.length === 0 ? (
                                        <p className="admin-muted">No media found for this folder.</p>
                                    ) : (
                                        <div className="admin-media-list">
                                            {mediaListing.files.map((item) => (
                                                <article className="admin-media-item" key={item.key}>
                                                    <div>
                                                        <h3>{item.relativeKey}</h3>
                                                        <p className="admin-muted">
                                                            {item.lastModified ? new Date(item.lastModified).toLocaleString() : "Uploaded"} · {formatBytes(item.size)}
                                                        </p>
                                                        <a href={item.publicUrl} target="_blank" rel="noreferrer">{item.publicUrl}</a>
                                                    </div>
                                                    <label className="admin-move-field">
                                                        Move to folder
                                                        <input
                                                            type="text"
                                                            value={moveDrafts[item.key] ?? getParentMediaPrefix(item.relativeKey)}
                                                            onChange={(event) => setMoveDrafts((currentDrafts) => ({
                                                                ...currentDrafts,
                                                                [item.key]: event.target.value,
                                                            }))}
                                                        />
                                                    </label>
                                                    <div className="admin-inline-actions">
                                                        <button className="admin-secondary-button" type="button" onClick={() => void copyToClipboard(item.publicUrl)}>
                                                            Copy URL
                                                        </button>
                                                        <button
                                                            className="admin-secondary-button"
                                                            type="button"
                                                            onClick={() => void moveMedia(item)}
                                                            disabled={movingMediaKey === item.key}
                                                        >
                                                            {movingMediaKey === item.key ? "Moving..." : "Move"}
                                                        </button>
                                                        <button className="admin-danger-button" type="button" onClick={() => void deleteMedia(item.key)}>
                                                            Delete
                                                        </button>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {activeTab === "settings" && (
                            <form className="admin-card admin-settings-form" onSubmit={saveSettings}>
                                <div className="admin-section-heading">
                                    <div>
                                        <h2>Site Settings</h2>
                                        <p className="admin-muted">These fields feed the public site at runtime. Upload images in the media tab, then paste the URL here.</p>
                                    </div>
                                </div>

                                <div className="admin-subsection">
                                    <div className="admin-section-heading">
                                        <div>
                                            <h2>Discord Alerts</h2>
                                            <p className="admin-muted">
                                                {notificationStatus?.discordEnabled
                                                    ? "New inquiries will post to your Discord channel."
                                                    : "Discord is not connected yet. Add DISCORD_WEBHOOK_URL to the Kubernetes secret and redeploy."}
                                            </p>
                                        </div>
                                        <button
                                            className="admin-secondary-button"
                                            type="button"
                                            onClick={() => void sendDiscordTest()}
                                            disabled={!notificationStatus?.discordEnabled || sendingDiscordTest}
                                        >
                                            {sendingDiscordTest ? "Sending..." : "Send Test"}
                                        </button>
                                    </div>
                                    <p className="admin-field-help">
                                        Admin link target: {notificationStatus?.publicAppUrl ? `${notificationStatus.publicAppUrl}/admin` : "Unavailable"}
                                    </p>
                                </div>

                                <div className="admin-form-grid">
                                    {settingsFields.map((field) => (
                                        <label className={field.multiline ? "admin-span-2" : undefined} key={field.key}>
                                            {field.label}
                                            {field.multiline ? (
                                                <textarea
                                                    value={settingsDraft[field.key]}
                                                    onChange={(event) => setSettingsDraft((currentDraft) => ({
                                                        ...currentDraft,
                                                        [field.key]: event.target.value,
                                                    }))}
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={settingsDraft[field.key]}
                                                    onChange={(event) => setSettingsDraft((currentDraft) => ({
                                                        ...currentDraft,
                                                        [field.key]: event.target.value,
                                                    }))}
                                                />
                                            )}
                                            {field.help && <span className="admin-field-help">{field.help}</span>}
                                        </label>
                                    ))}
                                </div>

                                <div className="admin-color-grid">
                                    {colorFields.map((field) => (
                                        <label key={field.key}>
                                            {field.label}
                                            <input
                                                type="color"
                                                value={settingsDraft[field.key]}
                                                onChange={(event) => setSettingsDraft((currentDraft) => ({
                                                    ...currentDraft,
                                                    [field.key]: event.target.value,
                                                }))}
                                            />
                                        </label>
                                    ))}
                                </div>

                                <button className="admin-primary-button" type="submit" disabled={savingSettings}>
                                    {savingSettings ? "Saving..." : "Save Site Settings"}
                                </button>
                            </form>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
