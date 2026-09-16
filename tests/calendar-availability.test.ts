import test from "node:test";
import assert from "node:assert/strict";
import { checkCalendarFeedsForDate } from "../src/server/calendarFeeds.js";
import type { CalendarFeed } from "../src/shared/crm.js";

const feed: CalendarFeed = {
  id: "test",
  name: "Test calendar",
  url: "https://calendar.example.invalid/test.ics",
  createdAt: "",
  updatedAt: "",
  lastFetchedAt: "",
  lastError: "",
};
const calendar = (...events: string[]) =>
  `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Availability tests//EN\r\n${events.join("\r\n")}\r\nEND:VCALENDAR`;
const event = (uid: string, fields: string) =>
  `BEGIN:VEVENT\r\nUID:${uid}\r\n${fields.replaceAll("\n", "\r\n")}\r\nEND:VEVENT`;
async function check(body: string, date: string): Promise<boolean> {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(body, { status: 200 });
  try {
    return await checkCalendarFeedsForDate([feed], date);
  } finally {
    globalThis.fetch = original;
  }
}

test("availability scans past 750 events and beyond the UI's three-year window", async () => {
  const events = Array.from({ length: 751 }, (_, i) =>
    event(`old-${i}`, "DTSTART:20200101T180000Z\nDTEND:20200101T190000Z"),
  );
  events.push(
    event("future", "DTSTART:20350110T180000Z\nDTEND:20350110T190000Z"),
  );
  assert.equal(await check(calendar(...events), "2035-01-10"), true);
  assert.equal(await check(calendar(...events), "2035-01-11"), false);
});

test("UTC intervals cross Denver midnight with exclusive end boundaries", async () => {
  const crossing = calendar(
    event("overnight", "DTSTART:20260916T053000Z\nDTEND:20260916T063000Z"),
  );
  assert.equal(await check(crossing, "2026-09-15"), true);
  assert.equal(await check(crossing, "2026-09-16"), true);
  const endingAtMidnight = calendar(
    event("midnight", "DTSTART:20260916T050000Z\nDTEND:20260916T060000Z"),
  );
  assert.equal(await check(endingAtMidnight, "2026-09-16"), false);
});

test("all-day DATE events reserve Denver civil days and default to one day", async () => {
  const body = calendar(
    event("all-day", "DTSTART;VALUE=DATE:20260916\nDTEND;VALUE=DATE:20260918"),
  );
  assert.equal(await check(body, "2026-09-15"), false);
  assert.equal(await check(body, "2026-09-16"), true);
  assert.equal(await check(body, "2026-09-17"), true);
  assert.equal(await check(body, "2026-09-18"), false);
  const oneDay = calendar(event("one-day", "DTSTART;VALUE=DATE:20260916"));
  assert.equal(await check(oneDay, "2026-09-16"), true);
  assert.equal(await check(oneDay, "2026-09-17"), false);
});

test("Denver DST days use calendar day boundaries rather than fixed 24-hour windows", async () => {
  assert.equal(
    await check(
      calendar(
        event("spring", "DTSTART:20260309T053000Z\nDTEND:20260309T054500Z"),
      ),
      "2026-03-08",
    ),
    true,
  );
  assert.equal(
    await check(
      calendar(
        event(
          "spring-after",
          "DTSTART:20260309T063000Z\nDTEND:20260309T064500Z",
        ),
      ),
      "2026-03-08",
    ),
    false,
  );
  assert.equal(
    await check(
      calendar(
        event("fall", "DTSTART:20261102T063000Z\nDTEND:20261102T064500Z"),
      ),
      "2026-11-01",
    ),
    true,
  );
  assert.equal(
    await check(
      calendar(
        event("fall-after", "DTSTART:20261102T073000Z\nDTEND:20261102T074500Z"),
      ),
      "2026-11-01",
    ),
    false,
  );
});

const denverZone = `BEGIN:VTIMEZONE\r\nTZID:America/Denver\r\nBEGIN:STANDARD\r\nDTSTART:19701101T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU\r\nTZOFFSETFROM:-0600\r\nTZOFFSETTO:-0700\r\nEND:STANDARD\r\nBEGIN:DAYLIGHT\r\nDTSTART:19700308T020000\r\nRRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU\r\nTZOFFSETFROM:-0700\r\nTZOFFSETTO:-0600\r\nEND:DAYLIGHT\r\nEND:VTIMEZONE`;
test("embedded timezone definitions and floating local times are respected", async () => {
  const body = calendar(
    denverZone,
    event(
      "zoned",
      "DTSTART;TZID=America/Denver:20260915T233000\nDTEND;TZID=America/Denver:20260916T003000",
    ),
  );
  assert.equal(await check(body, "2026-09-15"), true);
  assert.equal(await check(body, "2026-09-16"), true);
  assert.equal(
    await check(
      calendar(
        event("floating", "DTSTART:20260916T003000\nDTEND:20260916T013000"),
      ),
      "2026-09-15",
    ),
    false,
  );
});

test("recurrence EXDATE and cancellation overrides suppress only their own occurrence", async () => {
  const excluded = calendar(
    event(
      "daily",
      "DTSTART:20261001T160000Z\nDTEND:20261001T170000Z\nRRULE:FREQ=DAILY;COUNT=3\nEXDATE:20261002T160000Z",
    ),
  );
  assert.equal(await check(excluded, "2026-10-02"), false);
  assert.equal(await check(excluded, "2026-10-03"), true);
  const cancelled = calendar(
    event(
      "daily",
      "DTSTART:20261001T160000Z\nDTEND:20261001T170000Z\nRRULE:FREQ=DAILY;COUNT=3",
    ),
    event("daily", "RECURRENCE-ID:20261002T160000Z\nSTATUS:CANCELLED"),
  );
  assert.equal(await check(cancelled, "2026-10-02"), false);
  assert.equal(await check(cancelled, "2026-10-03"), true);
});

test("moved exceptions block their new date even outside original expansion range", async () => {
  const moved = calendar(
    event(
      "daily",
      "DTSTART:20261001T160000Z\nDTEND:20261001T170000Z\nRRULE:FREQ=DAILY;COUNT=3",
    ),
    event(
      "daily",
      "RECURRENCE-ID:20261003T160000Z\nDTSTART:20260928T160000Z\nDTEND:20260928T170000Z",
    ),
  );
  assert.equal(await check(moved, "2026-10-03"), false);
  assert.equal(await check(moved, "2026-09-28"), true);
});

test("exceptions from a different UID never override another series", async () => {
  const body = calendar(
    event(
      "first",
      "DTSTART:20261001T160000Z\nDTEND:20261001T170000Z\nRRULE:FREQ=DAILY;COUNT=3",
    ),
    event(
      "second",
      "DTSTART:20261001T160000Z\nDTEND:20261001T170000Z\nRRULE:FREQ=DAILY;COUNT=3\nSTATUS:CANCELLED",
    ),
    event("second", "RECURRENCE-ID:20261002T160000Z\nSTATUS:CANCELLED"),
  );
  assert.equal(await check(body, "2026-10-02"), true);
});

test("THISANDFUTURE backward shifts are checked beyond original date boundary", async () => {
  const body = calendar(
    event(
      "daily",
      "DTSTART:20261001T160000Z\nDTEND:20261001T170000Z\nRRULE:FREQ=DAILY;COUNT=4",
    ),
    event(
      "daily",
      "RECURRENCE-ID;RANGE=THISANDFUTURE:20261002T160000Z\nDTSTART:20260920T160000Z\nDTEND:20260920T170000Z",
    ),
  );
  assert.equal(await check(body, "2026-09-22"), true);
  assert.equal(await check(body, "2026-10-03"), false);
});

test("cancelled and transparent events do not block availability", async () => {
  assert.equal(
    await check(
      calendar(
        event("cancelled", "DTSTART;VALUE=DATE:20260916\nSTATUS:CANCELLED"),
        event("transparent", "DTSTART;VALUE=DATE:20260916\nTRANSP:TRANSPARENT"),
      ),
      "2026-09-16",
    ),
    false,
  );
});

test("an opaque recurrence exception can block a transparent series", async () => {
  const body = calendar(
    event(
      "transparent-series",
      "DTSTART:20261001T160000Z\nDTEND:20261001T170000Z\nRRULE:FREQ=DAILY;COUNT=3\nTRANSP:TRANSPARENT",
    ),
    event(
      "transparent-series",
      "RECURRENCE-ID:20261002T160000Z\nDTSTART:20261002T160000Z\nDTEND:20261002T170000Z\nTRANSP:OPAQUE",
    ),
  );
  assert.equal(await check(body, "2026-10-01"), false);
  assert.equal(await check(body, "2026-10-02"), true);
});

test("recurrence limits, missing timezones, malformed and incomplete feeds fail closed", async () => {
  await assert.rejects(
    check(
      calendar(
        event(
          "old-series",
          "DTSTART:20000101T160000Z\nDTEND:20000101T170000Z\nRRULE:FREQ=DAILY",
        ),
      ),
      "2026-10-03",
    ),
    /recurrence scan limit/,
  );
  await assert.rejects(
    check(
      calendar(
        event(
          "unknown-zone",
          "DTSTART;TZID=Missing\/Zone:20260916T100000\nDTEND;TZID=Missing\/Zone:20260916T110000",
        ),
      ),
      "2026-09-16",
    ),
    /timezone definition is missing/,
  );
  await assert.rejects(
    check(
      calendar(
        event(
          "orphan",
          "RECURRENCE-ID:20260916T100000Z\nDTSTART:20260916T110000Z",
        ),
      ),
      "2026-09-16",
    ),
    /missing its event series/,
  );
  await assert.rejects(
    check("not a calendar", "2026-09-16"),
    /could not be checked completely/,
  );
  await assert.rejects(
    check(calendar(), "2026-02-30"),
    /requested date is invalid/,
  );
  await assert.rejects(
    check(
      calendar(
        event(
          "floating-until",
          "DTSTART:20260901T100000\nDTEND:20260901T110000\nRRULE:FREQ=DAILY;UNTIL=20260916T160000Z",
        ),
      ),
      "2026-09-16",
    ),
    /inconsistent UTC end boundary/,
  );
  await assert.rejects(
    check(
      calendar(
        "BEGIN:VFREEBUSY\r\nFREEBUSY:20260916T100000Z/20260916T110000Z\r\nEND:VFREEBUSY",
      ),
      "2026-09-16",
    ),
    /Free\/busy components/,
  );
});

test("fetch failures prevent approval, including when another feed is free", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input) =>
    String(input).includes("unavailable")
      ? new Response("unavailable", { status: 503 })
      : new Response(calendar());
  try {
    await assert.rejects(
      checkCalendarFeedsForDate(
        [
          feed,
          {
            ...feed,
            id: "bad",
            url: "https://calendar.example.invalid/unavailable",
          },
        ],
        "2026-09-16",
      ),
      /could not be checked completely/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
