import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
    CalendarDisplayEvent,
    CalendarEvent,
    CalendarFeed,
    CalendarSnapshot,
    ImportedCalendarEvent,
    Lead,
    MediaFolderCreateResult,
    MediaItem,
    MediaUploadTarget,
} from "../shared/crm.js";
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

interface CalendarFeedDraft {
    name: string;
    url: string;
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

interface MediaTreeNode {
    name: string;
    path: string;
    folders: MediaTreeNode[];
    files: MediaItem[];
    totalFiles: number;
}

interface FolderMediaPreview {
    kind: "folder";
    name: string;
    path: string;
    files: MediaItem[];
    totalFiles: number;
}

interface FileMediaPreview {
    kind: "file";
    item: MediaItem;
}

type MediaPreview = FolderMediaPreview | FileMediaPreview;

const folderPreviewLimit = 36;
const bulkUploadConcurrency = 4;
const imagePreviewExtensions = new Set(["avif", "gif", "jpg", "jpeg", "png", "svg", "webp"]);
const directoryInputProps = {
    directory: "",
    webkitdirectory: "",
} as Record<string, string>;

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

const initialCalendarFeedDraft: CalendarFeedDraft = {
    name: "",
    url: "",
};

function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
    }).format(new Date(value));
}

function formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isImportedCalendarEvent(event: CalendarDisplayEvent): event is ImportedCalendarEvent {
    return "source" in event && event.source === "ical";
}

function getCalendarChipLabel(event: CalendarDisplayEvent): string {
    const timeLabel = isImportedCalendarEvent(event) && event.allDay
        ? "All day"
        : new Date(event.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    return `${timeLabel} ${event.title}`;
}

function getCalendarEventRange(event: CalendarDisplayEvent): string {
    if (isImportedCalendarEvent(event) && event.allDay) {
        const startDate = formatDate(event.start);
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        const inclusiveEnd = eventEnd > eventStart ? new Date(eventEnd) : eventEnd;

        if (eventEnd > eventStart) {
            inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);
        }

        const endDate = formatDate(inclusiveEnd.toISOString());

        return startDate === endDate ? startDate : `${startDate} to ${endDate}`;
    }

    return `${formatDateTime(event.start)} to ${formatDateTime(event.end)}`;
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
    const folders: MediaFolder[] = [{ name: "Media root", prefix: "", count: 0 }];
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

function getMediaItemName(relativeKey: string): string {
    const segments = normalizeMediaPrefix(relativeKey).split("/").filter(Boolean);
    return segments[segments.length - 1] ?? relativeKey;
}

function getFileRelativePath(file: File): string {
    return (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? "";
}

function getFileDisplayPath(file: File): string {
    return getFileRelativePath(file) || file.name;
}

function getUploadPrefixForFile(basePrefix: string, file: File): string {
    const relativePath = normalizeMediaPrefix(getFileRelativePath(file));
    if (!relativePath) {
        return normalizeMediaPrefix(basePrefix);
    }

    return joinMediaPrefix(basePrefix, getParentMediaPrefix(relativePath));
}

function buildMediaTree(items: MediaItem[], prefix: string): MediaTreeNode {
    const normalizedPrefix = normalizeMediaPrefix(prefix);
    const prefixWithSlash = normalizedPrefix ? `${normalizedPrefix}/` : "";
    const root: MediaTreeNode = {
        name: normalizedPrefix || "Media root",
        path: normalizedPrefix,
        folders: [],
        files: [],
        totalFiles: 0,
    };

    function getOrCreateFolder(parent: MediaTreeNode, name: string, path: string): MediaTreeNode {
        const existingFolder = parent.folders.find((folder) => folder.path === path);
        if (existingFolder) {
            return existingFolder;
        }

        const nextFolder: MediaTreeNode = {
            name,
            path,
            folders: [],
            files: [],
            totalFiles: 0,
        };
        parent.folders.push(nextFolder);
        return nextFolder;
    }

    for (const item of items) {
        let relativeKey = normalizeMediaPrefix(item.relativeKey);

        if (normalizedPrefix) {
            if (!relativeKey.startsWith(prefixWithSlash)) {
                continue;
            }

            relativeKey = relativeKey.slice(prefixWithSlash.length);
        }

        const segments = relativeKey.split("/").filter(Boolean);
        if (segments.length === 0) {
            continue;
        }

        if (item.isFolderMarker || item.relativeKey.endsWith("/")) {
            let currentFolder = root;
            let currentPath = normalizedPrefix;
            for (const segment of segments) {
                currentPath = joinMediaPrefix(currentPath, segment);
                currentFolder = getOrCreateFolder(currentFolder, segment, currentPath);
            }
            continue;
        }

        let currentFolder = root;
        let currentPath = normalizedPrefix;
        for (const segment of segments.slice(0, -1)) {
            currentPath = joinMediaPrefix(currentPath, segment);
            currentFolder = getOrCreateFolder(currentFolder, segment, currentPath);
        }

        currentFolder.files.push(item);
    }

    function sortAndCount(node: MediaTreeNode): number {
        node.folders.sort((left, right) => left.name.localeCompare(right.name));
        node.files.sort((left, right) => getMediaItemName(left.relativeKey).localeCompare(getMediaItemName(right.relativeKey)));
        node.totalFiles = node.files.length + node.folders.reduce((sum, folder) => sum + sortAndCount(folder), 0);
        return node.totalFiles;
    }

    sortAndCount(root);
    return root;
}

function collectMediaFolderPaths(node: MediaTreeNode): string[] {
    return node.folders.flatMap((folder) => [
        folder.path,
        ...collectMediaFolderPaths(folder),
    ]);
}

function collectMediaTreeFiles(node: MediaTreeNode): MediaItem[] {
    return [
        ...node.files,
        ...node.folders.flatMap((folder) => collectMediaTreeFiles(folder)),
    ];
}

function getMediaItemExtension(item: MediaItem): string {
    const mediaName = getMediaItemName(item.relativeKey);
    const extension = mediaName.includes(".") ? mediaName.split(".").pop() : "";
    return (extension ?? "").toLowerCase();
}

function canPreviewMediaItem(item: MediaItem): boolean {
    return imagePreviewExtensions.has(getMediaItemExtension(item));
}

function formatMediaTimestamp(item: MediaItem): string {
    return item.lastModified ? new Date(item.lastModified).toLocaleString() : "Uploaded";
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
    const quickUploadInputRef = useRef<HTMLInputElement | null>(null);
    const quickUploadPrefixRef = useRef("");
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
    const [importedCalendarEvents, setImportedCalendarEvents] = useState<ImportedCalendarEvent[]>([]);
    const [calendarFeeds, setCalendarFeeds] = useState<CalendarFeed[]>([]);
    const [settingsDraft, setSettingsDraft] = useState<SiteSettings>(defaultSiteSettings);
    const [notificationStatus, setNotificationStatus] = useState<NotificationStatus | null>(null);
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [mediaPrefix, setMediaPrefix] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [newFolderName, setNewFolderName] = useState("");
    const [moveDrafts, setMoveDrafts] = useState<Record<string, string>>({});
    const [movingMediaKey, setMovingMediaKey] = useState<string | null>(null);
    const [expandedMediaFolders, setExpandedMediaFolders] = useState<string[]>([]);
    const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
    const [creatingFolder, setCreatingFolder] = useState(false);
    const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
    const [savingSettings, setSavingSettings] = useState(false);
    const [sendingDiscordTest, setSendingDiscordTest] = useState(false);
    const [savingEvent, setSavingEvent] = useState(false);
    const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [calendarDraft, setCalendarDraft] = useState<CalendarDraft>(initialCalendarDraft);
    const [calendarFeedDraft, setCalendarFeedDraft] = useState<CalendarFeedDraft>(initialCalendarFeedDraft);
    const [savingCalendarFeed, setSavingCalendarFeed] = useState(false);
    const [deletingCalendarFeedId, setDeletingCalendarFeedId] = useState<string | null>(null);
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

    const applyCalendarSnapshot = useCallback((snapshot: CalendarSnapshot) => {
        setCalendarEvents(snapshot.events);
        setImportedCalendarEvents(snapshot.importedEvents);
        setCalendarFeeds(snapshot.feeds);
    }, []);

    const loadCalendar = useCallback(async () => {
        const nextCalendar = await request<CalendarSnapshot>("/api/admin/calendar");
        applyCalendarSnapshot(nextCalendar);
    }, [applyCalendarSnapshot]);

    const loadDashboard = useCallback(async () => {
        setLoadingDashboard(true);
        setDashboardError(null);

        try {
            const [nextLeads, nextCalendar, nextSettings, nextNotificationStatus] = await Promise.all([
                request<Lead[]>("/api/admin/leads"),
                request<CalendarSnapshot>("/api/admin/calendar"),
                request<SiteSettings>("/api/admin/settings"),
                request<NotificationStatus>("/api/admin/notifications/status"),
            ]);

            setLeads(nextLeads);
            applyCalendarSnapshot(nextCalendar);
            setSettingsDraft(nextSettings);
            setNotificationStatus(nextNotificationStatus);
            await loadMedia("");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load the CRM.";
            setDashboardError(message);
        } finally {
            setLoadingDashboard(false);
        }
    }, [applyCalendarSnapshot, loadMedia]);

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

    const allCalendarEvents = useMemo<CalendarDisplayEvent[]>(() => (
        [...calendarEvents, ...importedCalendarEvents].sort((left, right) => left.start.localeCompare(right.start))
    ), [calendarEvents, importedCalendarEvents]);

    const calendarEventsByDay = useMemo(() => {
        const entries = new Map<string, CalendarDisplayEvent[]>();

        for (const event of allCalendarEvents) {
            const key = formatDateKey(new Date(event.start));
            const dayEvents = entries.get(key) ?? [];
            dayEvents.push(event);
            dayEvents.sort((left, right) => left.start.localeCompare(right.start));
            entries.set(key, dayEvents);
        }

        return entries;
    }, [allCalendarEvents]);

    const visibleDays = useMemo(() => buildCalendarGrid(visibleMonth), [visibleMonth]);
    const upcomingEvents = allCalendarEvents;
    const leadCounts = useMemo(() => ({
        new: leads.filter((lead) => lead.status === "new").length,
        contacted: leads.filter((lead) => lead.status === "contacted").length,
        booked: leads.filter((lead) => lead.status === "booked").length,
        archived: leads.filter((lead) => lead.status === "archived").length,
    }), [leads]);
    const mediaTree = useMemo(() => buildMediaTree(mediaItems, mediaPrefix), [mediaItems, mediaPrefix]);
    const mediaFolderPaths = useMemo(() => collectMediaFolderPaths(mediaTree), [mediaTree]);
    const expandedMediaFolderSet = useMemo(() => new Set(expandedMediaFolders), [expandedMediaFolders]);
    const mediaBreadcrumbs = useMemo(() => getMediaBreadcrumbs(mediaPrefix), [mediaPrefix]);
    const selectedFileSummary = useMemo(() => {
        const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
        return {
            count: selectedFiles.length,
            totalBytes,
        };
    }, [selectedFiles]);

    useEffect(() => {
        setExpandedMediaFolders(mediaFolderPaths);
    }, [mediaFolderPaths]);

    useEffect(() => {
        if (!mediaPreview) {
            return undefined;
        }

        const handlePreviewKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setMediaPreview(null);
            }
        };

        window.addEventListener("keydown", handlePreviewKeyDown);
        return () => window.removeEventListener("keydown", handlePreviewKeyDown);
    }, [mediaPreview]);

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
        setImportedCalendarEvents([]);
        setCalendarFeeds([]);
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

    const saveCalendarFeed = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSavingCalendarFeed(true);
        setDashboardError(null);
        setNotice(null);

        try {
            const createdFeed = await request<CalendarFeed>("/api/admin/calendar/feeds", {
                method: "POST",
                body: JSON.stringify(calendarFeedDraft),
            });

            setCalendarFeedDraft(initialCalendarFeedDraft);
            setNotice(`Saved ${createdFeed.name} iCal link.`);
            await loadCalendar();
        } catch (error) {
            setDashboardError(error instanceof Error ? error.message : "Unable to save iCal link.");
        } finally {
            setSavingCalendarFeed(false);
        }
    };

    const deleteCalendarFeed = async (feedId: string) => {
        if (!window.confirm("Remove this iCal link? Imported events from it will stop showing.")) {
            return;
        }

        setDeletingCalendarFeedId(feedId);
        setDashboardError(null);
        setNotice(null);

        try {
            await requestVoid(`/api/admin/calendar/feeds/${feedId}`, {
                method: "DELETE",
            });
            setNotice("iCal link removed.");
            await loadCalendar();
        } catch (error) {
            setDashboardError(error instanceof Error ? error.message : "Unable to remove iCal link.");
        } finally {
            setDeletingCalendarFeedId(null);
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

    const createNewMediaFolder = async () => {
        const nextFolderPrefix = joinMediaPrefix(mediaPrefix, newFolderName);
        if (!nextFolderPrefix) {
            setDashboardError("Enter a folder name first.");
            return;
        }

        setCreatingFolder(true);
        setDashboardError(null);
        setNotice(null);

        try {
            const folder = await request<MediaFolderCreateResult>("/api/admin/media/folders", {
                method: "POST",
                body: JSON.stringify({
                    prefix: nextFolderPrefix,
                }),
            });
            setNewFolderName("");
            await loadMedia(folder.prefix);
            setExpandedMediaFolders((currentFolders) => (
                currentFolders.includes(folder.prefix)
                    ? currentFolders
                    : [...currentFolders, folder.prefix]
            ));
            setNotice(`Created folder ${folder.prefix}.`);
        } catch (error) {
            setDashboardError(error instanceof Error ? error.message : "Unable to create folder.");
        } finally {
            setCreatingFolder(false);
        }
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

    const uploadFiles = async (files: File[], basePrefix: string) => {
        if (files.length === 0) {
            setDashboardError("Choose at least one file before uploading.");
            return;
        }

        const uploadPrefix = normalizeMediaPrefix(basePrefix);
        setUploading(true);
        setDashboardError(null);
        setNotice(null);
        setUploadProgress(files.map((file) => ({
            fileName: getFileDisplayPath(file),
            status: "waiting",
        })));

        try {
            let nextIndex = 0;
            let failedUploads = 0;
            const workers = Array.from({ length: Math.min(bulkUploadConcurrency, files.length) }, async () => {
                while (nextIndex < files.length) {
                    const index = nextIndex;
                    nextIndex += 1;
                    const file = files[index];
                    try {
                        await uploadFile(file, getUploadPrefixForFile(uploadPrefix, file), index);
                    } catch {
                        failedUploads += 1;
                    }
                }
            });
            await Promise.all(workers);
            if (failedUploads > 0) {
                throw new Error(`${failedUploads} of ${files.length} upload${files.length === 1 ? "" : "s"} failed. Check the file list for details.`);
            }

            setSelectedFiles([]);
            setFileInputKey((currentKey) => currentKey + 1);
            await loadMedia(uploadPrefix);
            setNotice(`Uploaded ${files.length} file${files.length === 1 ? "" : "s"} to ${uploadPrefix || "media root"}.`);
        } catch (error) {
            setDashboardError(error instanceof Error ? error.message : "Unable to upload media.");
        } finally {
            setUploading(false);
        }
    };

    const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        await uploadFiles(selectedFiles, mediaPrefix);
    };

    const startFolderBulkUpload = (prefix: string) => {
        quickUploadPrefixRef.current = normalizeMediaPrefix(prefix);
        if (quickUploadInputRef.current) {
            quickUploadInputRef.current.value = "";
            quickUploadInputRef.current.click();
        }
    };

    const handleQuickUploadFiles = async (files: File[]) => {
        if (files.length === 0) {
            return;
        }

        await uploadFiles(files, quickUploadPrefixRef.current);
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

    const openFolderPreview = (folder: MediaTreeNode) => {
        setMediaPreview({
            kind: "folder",
            name: folder.name,
            path: folder.path,
            files: collectMediaTreeFiles(folder),
            totalFiles: folder.totalFiles,
        });
    };

    const openFilePreview = (item: MediaItem) => {
        setMediaPreview({ kind: "file", item });
    };

    const toggleMediaFolder = (folderPath: string) => {
        setExpandedMediaFolders((currentFolders) => (
            currentFolders.includes(folderPath)
                ? currentFolders.filter((currentPath) => currentPath !== folderPath)
                : [...currentFolders, folderPath]
        ));
    };

    const treeDepthStyle = (depth: number) => ({
        "--tree-depth": depth,
    }) as React.CSSProperties;

    const renderFilePreviewMedia = (item: MediaItem) => (
        canPreviewMediaItem(item) ? (
            <img src={item.publicUrl} alt={getMediaItemName(item.relativeKey)} />
        ) : (
            <div className="admin-preview-file-fallback">
                <span className="fa-regular fa-file" aria-hidden="true" />
                <strong>{getMediaItemName(item.relativeKey)}</strong>
            </div>
        )
    );

    const renderMediaPreview = () => {
        if (!mediaPreview) {
            return null;
        }

        if (mediaPreview.kind === "file") {
            const item = mediaPreview.item;

            return (
                <div className="admin-preview-backdrop" role="presentation" onClick={() => setMediaPreview(null)}>
                    <section
                        className="admin-preview-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="admin-file-preview-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="admin-preview-header">
                            <div>
                                <h2 id="admin-file-preview-title">{getMediaItemName(item.relativeKey)}</h2>
                                <p className="admin-muted">
                                    {getParentMediaPrefix(item.relativeKey) || "Media root"} · {formatMediaTimestamp(item)} · {formatBytes(item.size)}
                                </p>
                            </div>
                            <button className="admin-secondary-button" type="button" onClick={() => setMediaPreview(null)}>
                                Close
                            </button>
                        </div>
                        <div className="admin-file-preview-frame">
                            {renderFilePreviewMedia(item)}
                        </div>
                        <div className="admin-inline-actions">
                            <a className="admin-secondary-link" href={item.publicUrl} target="_blank" rel="noreferrer">
                                Open Original
                            </a>
                            <button className="admin-secondary-button" type="button" onClick={() => void copyToClipboard(item.publicUrl)}>
                                Copy URL
                            </button>
                        </div>
                    </section>
                </div>
            );
        }

        const visibleFiles = mediaPreview.files.slice(0, folderPreviewLimit);

        return (
            <div className="admin-preview-backdrop" role="presentation" onClick={() => setMediaPreview(null)}>
                <section
                    className="admin-preview-dialog admin-folder-preview-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="admin-folder-preview-title"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="admin-preview-header">
                        <div>
                            <h2 id="admin-folder-preview-title">{mediaPreview.name}</h2>
                            <p className="admin-muted">
                                {mediaPreview.path || "Media root"} · {mediaPreview.totalFiles} file{mediaPreview.totalFiles === 1 ? "" : "s"}
                            </p>
                        </div>
                        <button className="admin-secondary-button" type="button" onClick={() => setMediaPreview(null)}>
                            Close
                        </button>
                    </div>
                    <div className="admin-folder-preview-grid">
                        {visibleFiles.map((item) => (
                            <button
                                className="admin-folder-preview-item"
                                type="button"
                                key={item.key}
                                onClick={() => openFilePreview(item)}
                            >
                                <span className="admin-folder-preview-thumb">
                                    {canPreviewMediaItem(item) ? (
                                        <img src={item.publicUrl} alt="" loading="lazy" />
                                    ) : (
                                        <span className="fa-regular fa-file" aria-hidden="true" />
                                    )}
                                </span>
                                <span>{getMediaItemName(item.relativeKey)}</span>
                            </button>
                        ))}
                    </div>
                    {mediaPreview.files.length > folderPreviewLimit && (
                        <p className="admin-muted">
                            Showing {folderPreviewLimit} of {mediaPreview.files.length} files.
                        </p>
                    )}
                </section>
            </div>
        );
    };

    const renderMediaTreeNode = (node: MediaTreeNode, depth = 0): React.ReactNode => (
        <>
            {node.folders.map((folder) => {
                const isExpanded = expandedMediaFolderSet.has(folder.path);
                return (
                    <div className="admin-tree-branch" key={folder.path}>
                        <div className="admin-tree-folder-row" style={treeDepthStyle(depth)}>
                            <button
                                className="admin-tree-folder-toggle-button"
                                type="button"
                                onClick={() => toggleMediaFolder(folder.path)}
                                aria-expanded={isExpanded}
                            >
                                <span className="admin-tree-toggle">{isExpanded ? "-" : "+"}</span>
                                <span className="fa-solid fa-folder" aria-hidden="true" />
                                <span className="admin-tree-name">{folder.name}</span>
                                <span className="admin-tree-meta">{folder.totalFiles} file{folder.totalFiles === 1 ? "" : "s"}</span>
                            </button>
                            <div className="admin-tree-folder-actions">
                                <button className="admin-secondary-button" type="button" onClick={() => startFolderBulkUpload(folder.path)} disabled={uploading}>
                                    Upload
                                </button>
                                <button className="admin-secondary-button" type="button" onClick={() => openFolderPreview(folder)}>
                                    Preview
                                </button>
                            </div>
                        </div>
                        {isExpanded && renderMediaTreeNode(folder, depth + 1)}
                    </div>
                );
            })}

            {node.files.map((item) => (
                <article className="admin-tree-file-row" style={treeDepthStyle(depth)} key={item.key}>
                    <div className="admin-tree-file-main">
                        <span className="fa-regular fa-file-image" aria-hidden="true" />
                        <div>
                            <a href={item.publicUrl} target="_blank" rel="noreferrer">{getMediaItemName(item.relativeKey)}</a>
                            <p className="admin-muted">
                                {getParentMediaPrefix(item.relativeKey) || "Media root"} · {item.lastModified ? new Date(item.lastModified).toLocaleString() : "Uploaded"} · {formatBytes(item.size)}
                            </p>
                        </div>
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
                        <button className="admin-secondary-button" type="button" onClick={() => openFilePreview(item)}>
                            Preview
                        </button>
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
        </>
    );

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
                                                        isImportedCalendarEvent(event) ? (
                                                            <span
                                                                className="admin-calendar-chip is-imported"
                                                                key={event.id}
                                                                title={`Imported from ${event.sourceFeedName}`}
                                                            >
                                                                {getCalendarChipLabel(event)}
                                                            </span>
                                                        ) : (
                                                            <button
                                                                className="admin-calendar-chip"
                                                                key={event.id}
                                                                type="button"
                                                                onClick={() => startEditingEvent(event)}
                                                            >
                                                                {getCalendarChipLabel(event)}
                                                            </button>
                                                        )
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
                                                            <p className="admin-muted">{getCalendarEventRange(event)}</p>
                                                            {(event.clientName || event.location) && (
                                                                <p>{[event.clientName, event.location].filter(Boolean).join(" · ")}</p>
                                                            )}
                                                            {isImportedCalendarEvent(event) && (
                                                                <p className="admin-feed-source">Imported from {event.sourceFeedName}</p>
                                                            )}
                                                        </div>
                                                        {!isImportedCalendarEvent(event) && (
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
                                                        )}
                                                    </article>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="admin-card admin-calendar-feed-card">
                                        <div className="admin-section-heading">
                                            <div>
                                                <h2>iCal Links</h2>
                                                <p className="admin-muted">Saved links are imported into this calendar view.</p>
                                            </div>
                                            <button
                                                className="admin-secondary-button"
                                                type="button"
                                                onClick={() => void loadCalendar()}
                                                disabled={loadingDashboard}
                                            >
                                                Refresh
                                            </button>
                                        </div>

                                        <form className="admin-feed-form" onSubmit={saveCalendarFeed}>
                                            <label>
                                                Calendar name
                                                <input
                                                    type="text"
                                                    value={calendarFeedDraft.name}
                                                    onChange={(event) => setCalendarFeedDraft((currentDraft) => ({
                                                        ...currentDraft,
                                                        name: event.target.value,
                                                    }))}
                                                    placeholder="Google Calendar"
                                                />
                                            </label>
                                            <label>
                                                iCal URL
                                                <input
                                                    type="text"
                                                    inputMode="url"
                                                    value={calendarFeedDraft.url}
                                                    onChange={(event) => setCalendarFeedDraft((currentDraft) => ({
                                                        ...currentDraft,
                                                        url: event.target.value,
                                                    }))}
                                                    placeholder="https://calendar.google.com/calendar/ical/..."
                                                    required
                                                />
                                            </label>
                                            <button className="admin-primary-button" type="submit" disabled={savingCalendarFeed}>
                                                {savingCalendarFeed ? "Saving..." : "Add iCal Link"}
                                            </button>
                                        </form>

                                        {calendarFeeds.length === 0 ? (
                                            <p className="admin-muted">No iCal links saved yet.</p>
                                        ) : (
                                            <div className="admin-feed-list">
                                                {calendarFeeds.map((feed) => (
                                                    <article className={feed.lastError ? "admin-feed-item is-error" : "admin-feed-item"} key={feed.id}>
                                                        <div>
                                                            <h3>{feed.name}</h3>
                                                            <p className="admin-feed-url">{feed.url}</p>
                                                            {feed.lastError ? (
                                                                <p className="admin-feed-error">Import issue: {feed.lastError}</p>
                                                            ) : (
                                                                <p className="admin-muted">
                                                                    {feed.lastFetchedAt ? `Last imported ${formatDateTime(feed.lastFetchedAt)}` : "Saved and ready to import."}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button
                                                            className="admin-danger-button"
                                                            type="button"
                                                            onClick={() => void deleteCalendarFeed(feed.id)}
                                                            disabled={deletingCalendarFeedId === feed.id}
                                                        >
                                                            {deletingCalendarFeedId === feed.id ? "Removing..." : "Remove"}
                                                        </button>
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
                                <input
                                    ref={quickUploadInputRef}
                                    className="admin-visually-hidden"
                                    type="file"
                                    multiple
                                    aria-hidden="true"
                                    tabIndex={-1}
                                    onChange={(event) => void handleQuickUploadFiles(Array.from(event.target.files ?? []))}
                                />
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
                                            New folder
                                            <div className="admin-input-button-row">
                                                <input
                                                    type="text"
                                                    placeholder="new-gallery or Portfolio/Weddings/New Client"
                                                    value={newFolderName}
                                                    onChange={(event) => setNewFolderName(event.target.value)}
                                                />
                                                <button
                                                    className="admin-secondary-button"
                                                    type="button"
                                                    onClick={() => void openNewMediaFolder()}
                                                    disabled={creatingFolder}
                                                >
                                                    Open
                                                </button>
                                                <button
                                                    className="admin-primary-button"
                                                    type="button"
                                                    onClick={() => void createNewMediaFolder()}
                                                    disabled={creatingFolder}
                                                >
                                                    {creatingFolder ? "Creating..." : "Create"}
                                                </button>
                                            </div>
                                        </label>
                                    </div>

                                    <form className="admin-upload-panel" onSubmit={handleUpload}>
                                        <div className="admin-upload-picker-grid">
                                            <label>
                                                Bulk files
                                                <input
                                                    key={`files-${fileInputKey}`}
                                                    type="file"
                                                    multiple
                                                    onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                                                />
                                            </label>
                                            <label>
                                                Folder upload
                                                <input
                                                    key={`folder-${fileInputKey}`}
                                                    type="file"
                                                    multiple
                                                    {...directoryInputProps}
                                                    onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                                                />
                                            </label>
                                        </div>
                                        <p className="admin-upload-hint">
                                            Folder uploads keep their folder path inside the current media folder.
                                        </p>
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
                                                {uploading ? "Uploading..." : `Bulk Upload to ${mediaPrefix || "Media root"}`}
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
                                        <div>
                                            <h2>Media Library</h2>
                                            <p className="admin-muted">
                                                {mediaPrefix ? `Folder: ${mediaPrefix}` : "Folder: media root"} · {mediaTree.totalFiles} file{mediaTree.totalFiles === 1 ? "" : "s"}
                                            </p>
                                        </div>
                                        <div className="admin-inline-actions">
                                            <button
                                                className="admin-secondary-button"
                                                type="button"
                                                onClick={() => startFolderBulkUpload(mediaPrefix)}
                                                disabled={uploading}
                                            >
                                                Upload Here
                                            </button>
                                            <button
                                                className="admin-secondary-button"
                                                type="button"
                                                onClick={() => openFolderPreview(mediaTree)}
                                                disabled={mediaTree.totalFiles === 0}
                                            >
                                                Preview Folder
                                            </button>
                                            <button
                                                className="admin-secondary-button"
                                                type="button"
                                                onClick={() => setExpandedMediaFolders(mediaFolderPaths)}
                                                disabled={mediaFolderPaths.length === 0}
                                            >
                                                Expand All
                                            </button>
                                            <button
                                                className="admin-secondary-button"
                                                type="button"
                                                onClick={() => setExpandedMediaFolders([])}
                                                disabled={mediaFolderPaths.length === 0}
                                            >
                                                Collapse All
                                            </button>
                                        </div>
                                    </div>

                                    {mediaTree.totalFiles === 0 && mediaTree.folders.length === 0 ? (
                                        <p className="admin-muted">No media found for this folder.</p>
                                    ) : (
                                        <div className="admin-media-tree" aria-label="S3 media bucket">
                                            {renderMediaTreeNode(mediaTree)}
                                        </div>
                                    )}
                                </div>
                                {renderMediaPreview()}
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
