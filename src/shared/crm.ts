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

export interface MediaItem {
    key: string;
    relativeKey: string;
    size: number;
    lastModified: string | null;
    publicUrl: string;
}

export interface CrmSnapshot {
    leads: Lead[];
    calendar: CalendarEvent[];
    settings: SiteSettings;
}
