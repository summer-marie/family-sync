import type { ScheduleEvent } from "./privacy";

// Subset of the Google Calendar API event shape relevant to normalization.
type GoogleCalendarEvent = {
  id?: string | null;
  summary?: string | null;
  start?: {
    dateTime?: string | null;
    date?: string | null;
  };
  end?: {
    dateTime?: string | null;
    date?: string | null;
  };
};

const NO_TITLE = "(no title)";

/**
 * normalizeEvents converts raw Google Calendar API events into the compact
 * ScheduleEvent shape used by privacy filtering, schedule summaries, and AI
 * prompt construction. All-day events (date-only) are distinguished from timed
 * events (dateTime) so downstream logic can treat them correctly.
 *
 * Missing summaries fall back to "(no title)" so downstream code never sees an
 * undefined title. Events without usable start/end values are skipped to keep
 * schedule summaries clean.
 */
export function normalizeEvents(
  events: GoogleCalendarEvent[],
): ScheduleEvent[] {
  const normalized: ScheduleEvent[] = [];

  for (const event of events) {
    const startInput = pickDateValue(event.start);
    const endInput = pickDateValue(event.end);
    if (!startInput || !endInput) {
      // Skip events with unusable timing data so they cannot corrupt
      // availability calculations or summaries.
      continue;
    }

    const isAllDay =
      event.start?.date != null && event.start?.dateTime == null;

    normalized.push({
      title: event.summary ?? NO_TITLE,
      start: startInput,
      end: endInput,
      isAllDay,
    });
  }

  return normalized;
}

// Returns the most specific date value present on a Google start/end block.
function pickDateValue(
  block: { dateTime?: string | null; date?: string | null } | undefined,
): string | null {
  if (!block) return null;
  if (block.dateTime) return block.dateTime;
  if (block.date) return block.date;
  return null;
}