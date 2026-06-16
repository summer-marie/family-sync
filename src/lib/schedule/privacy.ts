import "server-only";

// Visibility is binary per AGENTS.md: either full event details are allowed,
// or events are reduced to privacy-safe busy/blocked information.
export type Visibility = "FULL" | "BUSY_ONLY";

// Normalized compact event shape produced by normalize.ts.
export type ScheduleEvent = {
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
};

// Privacy-safe label used when event details must not be exposed.
const BUSY_LABEL = "Busy";

/**
 * applyPrivacyFilter is the mandatory shared privacy utility required by
 * AGENTS.md before any calendar-derived output (AI prompt context, schedule
 * summaries, availability summaries, shared schedule responses) is built.
 *
 * When visibility is BUSY_ONLY the title is replaced with "Busy" and no
 * reference to the original title is retained. Start/end times and the all-day
 * flag are always preserved so availability calculations remain accurate.
 *
 * This function never mutates the input event.
 */
export function applyPrivacyFilter(
  event: ScheduleEvent,
  visibility: Visibility,
): ScheduleEvent {
  if (visibility === "FULL") {
    return { ...event };
  }

  // BUSY_ONLY: strip the title, keep timing information only.
  const { title: _title, ...withoutTitle } = event;
  return { ...withoutTitle, title: BUSY_LABEL };
}