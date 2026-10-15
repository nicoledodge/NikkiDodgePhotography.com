import WebsiteEditor from "../site/WebsiteEditor";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "../styles/admin.css";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
    CalendarDisplayEvent,
    CalendarEvent,
    CalendarFeed,
    CalendarSnapshot,
    ImportedCalendarEvent,
    Lead,
} from "../shared/crm.js";
import { defaultSiteSettings, type SiteSettings } from "../shared/siteSettings.js";
import { useSiteSettings } from "../site/SiteSettingsContext";

type AdminTab = "leads" | "calendar" | "website" | "settings";

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

const tabLabels: Record<AdminTab, string> = {
    leads: "Leads",
    calendar: "Calendar",
    website: "Website",
    settings: "Business Settings",
};

const settingsFields: Array<{
    key: keyof SiteSettings;
    label: string;
    multiline?: boolean;
    help?: string;
}> = [
    { key: "contactEmail", label: "Contact Email" },
    { key: "contactPhone", label: "Contact Phone" },
    { key: "instagramUrl", label: "Instagram URL", help: "Used by public social links." },
    { key: "serviceArea", label: "Service Area" },
    { key: "profilePhotoUrl", label: "Profile Photo URL", help: "Used on the home and about pages. Choose a published website photo URL. Manage original photos in Mountain Turtle." },
    { key: "profileName", label: "Profile Name" },
    { key: "profileRole", label: "Profile Role", multiline: true },
    { key: "aboutPageBody", label: "About Page Body", multiline: true },
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
    const [activeTab, setActiveTab] = useState<AdminTab>(() => new URLSearchParams(window.location.search).get("workspace") === "website" ? "website" : "leads");
    const [websiteOpened, setWebsiteOpened] = useState(activeTab === "website");
    const [websiteDirty, setWebsiteDirty] = useState(false);
    useEffect(() => { if (activeTab === "website") setWebsiteOpened(true); }, [activeTab]);
    const [notice, setNotice] = useState<string | null>(null);
    const [dashboardError, setDashboardError] = useState<string | null>(null);
    const [loadingDashboard, setLoadingDashboard] = useState(false);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [importedCalendarEvents, setImportedCalendarEvents] = useState<ImportedCalendarEvent[]>([]);
    const [calendarFeeds, setCalendarFeeds] = useState<CalendarFeed[]>([]);
    const [settingsDraft, setSettingsDraft] = useState<SiteSettings>(defaultSiteSettings);
    const [notificationStatus, setNotificationStatus] = useState<NotificationStatus | null>(null);
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
    const [visibleMonth, setVisibleMonth] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });

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
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load the CRM.";
            setDashboardError(message);
        } finally {
            setLoadingDashboard(false);
        }
    }, [applyCalendarSnapshot]);

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
        if (websiteDirty && !window.confirm("Sign out and discard unsaved website changes? Save your draft first to keep them.")) return;
        await request<SessionResponse>("/api/auth/logout", {
            method: "POST",
        });

        setAuthenticated(false);
        setUsername("");
        setLeads([]);
        setCalendarEvents([]);
        setImportedCalendarEvents([]);
        setCalendarFeeds([]);
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
                        <p className="admin-muted">Sign in to manage inquiries, your calendar, and website content.</p>
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

                        {websiteOpened && <div hidden={activeTab !== "website"}><WebsiteEditor onDirtyChange={setWebsiteDirty} /></div>}

                        {activeTab === "settings" && (
                            <form className="admin-card admin-settings-form" onSubmit={saveSettings}>
                                <div className="admin-section-heading">
                                    <div>
                                        <h2>Business Settings</h2>
                                        <p className="admin-muted">Update your contact details and profile. Open Website to edit page layouts, sections, text, and photographs.</p>
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
