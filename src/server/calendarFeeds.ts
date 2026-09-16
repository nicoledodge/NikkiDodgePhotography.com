import ICAL from "ical.js";
import { DateTime } from "luxon";
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
const availabilityZone = "America/Denver";
const maxAvailabilityComponents = 10000;
const maxAvailabilityIterations = 25000;

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

function availabilityError(reason: string): Error {
    return new Error(`A connected calendar could not be checked completely. ${reason}`);
}

function calendarTimeMillis(time: IcalTime, floatingZone: string): number {
    if (!time) throw availabilityError("An event is missing its date.");
    // DATE values block civil days in the photography business's timezone.
    // Floating DATE-TIME values use the feed timezone, or Denver when unspecified.
    if (time.isDate || time.zone.tzid === "floating") {
        const value = DateTime.fromObject({
            year: time.year, month: time.month, day: time.day,
            hour: time.isDate ? 0 : time.hour, minute: time.isDate ? 0 : time.minute, second: time.isDate ? 0 : time.second,
        }, { zone: time.isDate ? availabilityZone : floatingZone });
        if (!value.isValid) throw availabilityError("An event has an invalid date or timezone.");
        return value.toMillis();
    }
    const value = time.toUnixTime() * 1000;
    if (!Number.isFinite(value)) throw availabilityError("An event has an invalid date.");
    return value;
}

function eventBlocksTime(component: IcalComponent): boolean {
    return calendarStatusFromComponent(component) !== "cancelled"
        && cleanText(component.getFirstPropertyValue("transp")).toUpperCase() !== "TRANSPARENT";
}

function checkCalendarTextForDate(calendarText: string, dayStart: number, dayEnd: number): boolean {
    const calendar = new ICAL.Component(ICAL.parse(calendarText));
    if (calendar.name !== "vcalendar") throw availabilityError("The feed is not an iCalendar document.");
    if (calendar.getAllSubcomponents("vfreebusy").length) throw availabilityError("Free/busy components require calendar review.");
    for (const timezone of calendar.getAllSubcomponents("vtimezone")) {
        const transitions = timezone.getAllSubcomponents().filter(component => ["standard", "daylight"].includes(component.name));
        if (!transitions.length || transitions.some(component => !component.hasProperty("dtstart") || !component.hasProperty("tzoffsetfrom") || !component.hasProperty("tzoffsetto"))) {
            throw availabilityError("A timezone definition is incomplete.");
        }
    }
    const components = calendar.getAllSubcomponents("vevent");
    if (components.length > maxAvailabilityComponents) throw availabilityError("The calendar exceeds the event scan limit.");
    const floatingZone = cleanText(calendar.getFirstPropertyValue("x-wr-timezone")) || availabilityZone;
    if (!DateTime.now().setZone(floatingZone).isValid) throw availabilityError("The calendar timezone is unknown.");
    const masters = new Map<string, IcalComponent>();
    const exceptions = new Map<string, IcalComponent[]>();
    let iterations = 0;
    let busy = false;

    for (const component of components) {
        const uid = cleanText(component.getFirstPropertyValue("uid"));
        if (!uid) throw availabilityError("An event is missing its unique identifier.");
        if (component.hasProperty("exrule")) throw availabilityError("The calendar uses an unsupported recurrence exclusion rule.");
        for (const propertyName of ["dtstart", "dtend", "recurrence-id", "rdate", "exdate"]) {
            for (const property of component.getAllProperties(propertyName)) {
                if (property.type === "period") throw availabilityError("Period-valued recurrence dates require calendar review.");
                const timezone = property.getParameter("tzid");
                if (timezone && (typeof timezone !== "string" || (!calendar.getTimeZoneByID(timezone) && !ICAL.TimezoneService.get(timezone)))) {
                    // ICAL otherwise silently treats an unknown TZID as floating time.
                    throw availabilityError("A referenced timezone definition is missing.");
                }
            }
        }
        if (component.hasProperty("recurrence-id")) {
            const related = exceptions.get(uid) || [];
            const recurrenceId = component.getFirstPropertyValue("recurrence-id") as IcalTime;
            if (related.some(other => String(other.getFirstPropertyValue("recurrence-id")) === String(recurrenceId))) {
                throw availabilityError("The calendar contains duplicate recurrence overrides.");
            }
            // Cancellation overrides may legitimately omit DTSTART and DTEND.
            if (!component.hasProperty("dtstart") && !eventBlocksTime(component)) {
                component.addPropertyWithValue("dtstart", recurrenceId.clone());
            }
            related.push(component);
            exceptions.set(uid, related);
        } else {
            if (masters.has(uid)) throw availabilityError("The calendar contains duplicate event series.");
            masters.set(uid, component);
        }
    }
    for (const uid of exceptions.keys()) {
        if (!masters.has(uid)) throw availabilityError("A recurrence override is missing its event series.");
    }

    const overlaps = (start: IcalTime, end: IcalTime): boolean => {
        const startMillis = calendarTimeMillis(start, floatingZone);
        const endMillis = calendarTimeMillis(end, floatingZone);
        if (endMillis < startMillis) throw availabilityError("An event ends before it starts.");
        // A timed event without an end is an instant, and still occupies its date.
        return endMillis === startMillis ? startMillis >= dayStart && startMillis < dayEnd : startMillis < dayEnd && endMillis > dayStart;
    };

    for (const [uid, component] of masters) {
        const related = exceptions.get(uid) || [];
        if (!eventBlocksTime(component) && !related.some(eventBlocksTime)) continue;
        const event = new ICAL.Event(component, { exceptions: related, strictExceptions: true });
        if (!event.startDate) throw availabilityError("An event is missing its start date.");
        // Validate event duration even when its start is beyond the requested date.
        if (calendarTimeMillis(event.endDate, floatingZone) < calendarTimeMillis(event.startDate, floatingZone)) {
            throw availabilityError("An event ends before it starts.");
        }
        if (!event.isRecurring()) {
            if (related.length) throw availabilityError("A nonrecurring event has recurrence overrides.");
            busy = overlaps(event.startDate, event.endDate) || busy;
            continue;
        }

        for (const property of component.getAllProperties("rrule")) {
            const rule = property.getFirstValue() as InstanceType<typeof ICAL.Recur>;
            if (rule.until && event.startDate.zone.tzid === "floating" && !event.startDate.isDate && rule.until.zone.tzid === "UTC") {
                throw availabilityError("A floating recurrence has an inconsistent UTC end boundary.");
            }
        }

        let maximumBackwardShift = 0;
        let hasRangeException = false;
        for (const exceptionComponent of related) {
            const exception = new ICAL.Event(exceptionComponent);
            if (!eventBlocksTime(exceptionComponent)) continue;
            // Check moved-in overrides before stopping expansion at the day boundary.
            busy = overlaps(exception.startDate, exception.endDate) || busy;
            if (exception.modifiesFuture()) {
                hasRangeException = true;
                maximumBackwardShift = Math.max(maximumBackwardShift,
                    calendarTimeMillis(exception.recurrenceId, floatingZone) - calendarTimeMillis(exception.startDate, floatingZone));
            }
        }
        // Two days cover timezone/DST offset differences in a THISANDFUTURE shift.
        const expansionEnd = dayEnd + (hasRangeException ? maximumBackwardShift + 2 * 86400000 : 0);
        const iterator = event.iterator();
        let complete = false;
        for (let count = 0; count < maxRecurrenceIterationsPerEvent; count += 1) {
            iterations += 1;
            if (iterations > maxAvailabilityIterations) throw availabilityError("The calendar exceeds the recurrence scan limit.");
            const occurrence = iterator.next() as IcalTime | null;
            if (!occurrence || calendarTimeMillis(occurrence, floatingZone) >= expansionEnd) { complete = true; break; }
            const details = event.getOccurrenceDetails(occurrence);
            if (eventBlocksTime(details.item.component)) busy = overlaps(details.startDate, details.endDate) || busy;
        }
        if (!complete) throw availabilityError("An event exceeds the recurrence scan limit.");
    }
    return busy;
}

/** Authoritative, date-specific check. Never uses the truncated calendar UI snapshot. */
export async function checkCalendarFeedsForDate(feeds: CalendarFeed[], eventDate: string): Promise<boolean> {
    const start = DateTime.fromISO(eventDate, { zone: availabilityZone }).startOf("day");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !start.isValid) throw availabilityError("The requested date is invalid.");
    const end = start.plus({ days: 1 });
    let busy = false;
    for (const feed of feeds) {
        try {
            busy = checkCalendarTextForDate(await fetchCalendarText(feed), start.toMillis(), end.toMillis()) || busy;
        } catch (error) {
            if (error instanceof Error && error.message.startsWith("A connected calendar could not be checked completely.")) throw error;
            throw availabilityError("Refresh the feed or check its events before approving this date.");
        }
    }
    return busy;
}
