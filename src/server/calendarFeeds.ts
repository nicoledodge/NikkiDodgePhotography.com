import ICAL from "ical.js";
import type { CalendarEventStatus, CalendarFeed, ImportedCalendarEvent } from "../shared/crm.js";

type IcalComponent = InstanceType<typeof ICAL.Component>;
type IcalEvent = InstanceType<typeof ICAL.Event>;
type IcalTime = InstanceType<typeof ICAL.Time>;

const fetchTimeoutMs = 12000;
const maxCalendarBytes = 4 * 1024 * 1024;
const maxImportedEventsPerFeed = 750;
const maxRecurrenceIterationsPerEvent = 5000;
const importWindowPastDays = 365;
const importWindowFutureDays = 365 * 3;

interface CalendarFeedImportResult {
    feeds: CalendarFeed[];
    importedEvents: ImportedCalendarEvent[];
}

function cleanText(input: unknown): string {
    return typeof input === "string" ? input.trim() : "";
}

function getFeedDisplayName(feed: CalendarFeed): string {
    if (feed.name.trim()) {
        return feed.name.trim();
    }

    try {
        return new URL(feed.url).hostname;
    } catch {
        return "iCal feed";
    }
}

export function normalizeCalendarFeedUrl(input: unknown): string | null {
    const rawUrl = cleanText(input);
    if (!rawUrl) {
        return null;
    }

    const urlText = rawUrl.replace(/^webcal:\/\//i, "https://");

    try {
        const url = new URL(urlText);
        if (url.protocol !== "https:" && url.protocol !== "http:") {
            return null;
        }

        return url.toString();
    } catch {
        return null;
    }
}

function calendarStatusFromComponent(component: IcalComponent): CalendarEventStatus {
    const status = cleanText(component.getFirstPropertyValue("status")).toLowerCase();

    if (status === "tentative") {
        return "tentative";
    }

    if (status === "cancelled" || status === "canceled") {
        return "cancelled";
    }

    return "confirmed";
}

function getImportWindow(): { start: IcalTime; end: IcalTime } {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - importWindowPastDays);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setDate(end.getDate() + importWindowFutureDays);
    end.setHours(23, 59, 59, 999);

    return {
        start: ICAL.Time.fromJSDate(start, true),
        end: ICAL.Time.fromJSDate(end, true),
    };
}

function isEventInWindow(start: IcalTime, end: IcalTime, windowStart: IcalTime, windowEnd: IcalTime): boolean {
    return end.compare(windowStart) >= 0 && start.compare(windowEnd) <= 0;
}

function buildImportedEventId(feedId: string, uid: string, startIso: string): string {
    const encodedKey = Buffer.from(`${uid}:${startIso}`).toString("base64url");
    return `ical:${feedId}:${encodedKey}`;
}

function getImportedEvent(
    feed: CalendarFeed,
    event: IcalEvent,
    startDate: IcalTime,
    endDate: IcalTime,
): ImportedCalendarEvent {
    const startIso = startDate.toJSDate().toISOString();
    const uid = cleanText(event.uid) || `${cleanText(event.summary)}-${startIso}`;

    return {
        id: buildImportedEventId(feed.id, uid, startIso),
        title: cleanText(event.summary) || "Untitled event",
        clientName: "",
        start: startIso,
        end: endDate.toJSDate().toISOString(),
        location: cleanText(event.location),
        status: calendarStatusFromComponent(event.component),
        notes: cleanText(event.description),
        allDay: startDate.isDate,
        source: "ical",
        sourceFeedId: feed.id,
        sourceFeedName: getFeedDisplayName(feed),
        externalUid: uid,
    };
}

async function fetchCalendarText(feed: CalendarFeed): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);

    try {
        const response = await fetch(feed.url, {
            headers: {
                Accept: "text/calendar, application/calendar+xml;q=0.8, text/plain;q=0.7, */*;q=0.5",
            },
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Feed returned HTTP ${response.status}.`);
        }

        const contentLength = Number(response.headers.get("content-length") ?? "0");
        if (Number.isFinite(contentLength) && contentLength > maxCalendarBytes) {
            throw new Error("Feed is too large to import.");
        }

        const text = await response.text();
        if (Buffer.byteLength(text, "utf8") > maxCalendarBytes) {
            throw new Error("Feed is too large to import.");
        }

        return text;
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new Error("Feed request timed out.");
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

function parseCalendarEvents(feed: CalendarFeed, calendarText: string): ImportedCalendarEvent[] {
    const calendar = new ICAL.Component(ICAL.parse(calendarText));
    const window = getImportWindow();
    const importedEvents: ImportedCalendarEvent[] = [];
    const importedIds = new Set<string>();

    for (const eventComponent of calendar.getAllSubcomponents("vevent")) {
        if (importedEvents.length >= maxImportedEventsPerFeed) {
            break;
        }

        const event = new ICAL.Event(eventComponent);
        if (event.isRecurrenceException()) {
            continue;
        }

        if (event.isRecurring()) {
            const iterator = event.iterator();
            let iterations = 0;

            while (iterations < maxRecurrenceIterationsPerEvent && importedEvents.length < maxImportedEventsPerFeed) {
                iterations += 1;
                const occurrence = iterator.next() as IcalTime | null;
                if (!occurrence) {
                    break;
                }

                if (occurrence.compare(window.end) > 0) {
                    break;
                }

                const occurrenceDetails = event.getOccurrenceDetails(occurrence);
                if (!isEventInWindow(occurrenceDetails.startDate, occurrenceDetails.endDate, window.start, window.end)) {
                    continue;
                }

                const importedEvent = getImportedEvent(
                    feed,
                    occurrenceDetails.item,
                    occurrenceDetails.startDate,
                    occurrenceDetails.endDate,
                );

                if (!importedIds.has(importedEvent.id)) {
                    importedIds.add(importedEvent.id);
                    importedEvents.push(importedEvent);
                }
            }

            continue;
        }

        if (!isEventInWindow(event.startDate, event.endDate, window.start, window.end)) {
            continue;
        }

        const importedEvent = getImportedEvent(feed, event, event.startDate, event.endDate);
        if (!importedIds.has(importedEvent.id)) {
            importedIds.add(importedEvent.id);
            importedEvents.push(importedEvent);
        }
    }

    return importedEvents.sort((left, right) => left.start.localeCompare(right.start));
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unable to import feed.";
}

export async function importCalendarFeeds(feeds: CalendarFeed[]): Promise<CalendarFeedImportResult> {
    const results = await Promise.all(feeds.map(async (feed) => {
        const now = new Date().toISOString();

        try {
            const calendarText = await fetchCalendarText(feed);
            const importedEvents = parseCalendarEvents(feed, calendarText);

            return {
                feed: {
                    ...feed,
                    lastFetchedAt: now,
                    lastError: "",
                },
                importedEvents,
            };
        } catch (error) {
            return {
                feed: {
                    ...feed,
                    lastFetchedAt: now,
                    lastError: getErrorMessage(error),
                },
                importedEvents: [],
            };
        }
    }));

    return {
        feeds: results.map((result) => result.feed),
        importedEvents: results
            .flatMap((result) => result.importedEvents)
            .sort((left, right) => left.start.localeCompare(right.start)),
    };
}
