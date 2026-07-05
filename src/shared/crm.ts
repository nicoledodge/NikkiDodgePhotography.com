import type { SiteSettings } from "./siteSettings.js";

export type LeadStatus = "new" | "contacted" | "booked" | "archived";

export interface Lead {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    telephone: string;
    email: string;
    subject: string;
    message: string;
    status: LeadStatus;
    source: string;
    notes: string;
}

export type CalendarEventStatus = "tentative" | "confirmed" | "completed" | "cancelled";

export interface CalendarEvent {
    id: string;
    createdAt: string;
    updatedAt: string;
    title: string;
    clientName: string;
    start: string;
    end: string;
    location: string;
    status: CalendarEventStatus;
    notes: string;
}

export interface CalendarFeed {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    url: string;
    lastFetchedAt: string;
    lastError: string;
}

export interface ImportedCalendarEvent {
    id: string;
    title: string;
    clientName: string;
    start: string;
    end: string;
    location: string;
    status: CalendarEventStatus;
    notes: string;
    allDay: boolean;
    source: "ical";
    sourceFeedId: string;
    sourceFeedName: string;
    externalUid: string;
}

export type CalendarDisplayEvent = CalendarEvent | ImportedCalendarEvent;

export interface CalendarSnapshot {
    events: CalendarEvent[];
    importedEvents: ImportedCalendarEvent[];
    feeds: CalendarFeed[];
}

export interface MediaItem {
    key: string;
    relativeKey: string;
    size: number;
    lastModified: string | null;
    publicUrl: string;
}

export interface MediaUploadTarget {
    method: "s3" | "server";
    uploadUrl: string;
    key: string;
    relativeKey: string;
    publicUrl: string;
    headers: Record<string, string>;
    maxBytes: number;
    expiresAt: string | null;
}

export interface CrmSnapshot {
    leads: Lead[];
    calendar: CalendarEvent[];
    calendarFeeds: CalendarFeed[];
    settings: SiteSettings;
}
