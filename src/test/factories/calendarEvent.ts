// Shared test fixture factory for raw Google Calendar event objects.
//
// This mirrors the raw shape returned by the Google Calendar API
// (calendar.events.list) as consumed by normalizeEvents(). Keeping the
// factory in one place lets schedule, privacy, and service tests build
// consistent fixtures without duplicating the event shape everywhere.
//
// The builder is intentionally permissive: it returns a sensible default
// timed event and allows deep partial overrides so tests can express only
// the fields they care about.

/**
 * Raw Google Calendar event start/end block. Either a timed `dateTime` or an
 * all-day `date` is present (or both, to exercise the normalize precedence
 * rule).
 */
export type RawGoogleEventStartEnd = {
  dateTime?: string | null;
  date?: string | null;
};

/**
 * Raw Google Calendar event shape as returned by the API. Fields not used by
 * normalizeEvents() are omitted for brevity.
 */
export type RawGoogleCalendarEvent = {
  id: string;
  summary?: string | null;
  start: RawGoogleEventStartEnd;
  end: RawGoogleEventStartEnd;
};

/**
 * Build a raw Google Calendar event with sensible defaults. Pass a partial
 * override to change only the fields a test cares about.
 *
 * @example
 *   makeCalendarEvent({ id: "a", summary: "Soccer practice" })
 *   makeCalendarEvent({ start: { date: "2024-06-10" }, end: { date: "2024-06-11" } })
 */
export function makeCalendarEvent(
  overrides: Partial<RawGoogleCalendarEvent> = {},
): RawGoogleCalendarEvent {
  return {
    id: "evt-1",
    summary: "Team standup",
    start: { dateTime: "2024-06-10T09:00:00-07:00" },
    end: { dateTime: "2024-06-10T09:30:00-07:00" },
    ...overrides,
  };
}

/**
 * Build a list of raw Google Calendar events. Accepts either full overrides
 * or, for convenience, a count to produce N distinct events.
 */
export function makeCalendarEvents(
  events: Array<Partial<RawGoogleCalendarEvent>> = [],
): RawGoogleCalendarEvent[] {
  return events.map((overrides, index) =>
    makeCalendarEvent({
      id: `evt-${index + 1}`,
      summary: `Event ${index + 1}`,
      ...overrides,
    }),
  );
}