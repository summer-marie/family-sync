import "server-only";

import type { FamilyScheduleEntry } from "@/features/calendar/services";

type ChatMessage = { role: "system" | "user"; content: string };

/**
 * buildChatMessages constructs the [system, user] message pair sent to the
 * AI model. Privacy filtering must be applied to `schedule` before calling
 * this function — the builder trusts the input is already filtered.
 *
 * The system message contains:
 * - A strict instruction to answer only from provided schedule data.
 * - A prohibition on inventing events or taking calendar actions.
 * - A compact, human-readable schedule summary per member.
 */
export function buildChatMessages(
  question: string,
  schedule: FamilyScheduleEntry[],
): ChatMessage[] {
  const summary = buildScheduleSummary(schedule);

  const system = `You are a family schedule assistant. Answer questions only from the schedule data provided below. Do not invent events, do not create or edit calendar entries, and do not take any actions beyond answering the question.

Family schedule:
${summary}`;

  return [
    { role: "system", content: system },
    { role: "user", content: question },
  ];
}

function buildScheduleSummary(schedule: FamilyScheduleEntry[]): string {
  if (schedule.length === 0) {
    return "No schedule data available.";
  }

  return schedule
    .map((entry) => {
      if (entry.status === "unavailable") {
        return `${entry.userId}: calendar unavailable`;
      }

      if (entry.events.length === 0) {
        return `${entry.userId}: no events`;
      }

      const eventLines = entry.events
        .map((e) => {
          const timeLabel = e.isAllDay
            ? `all day ${e.start}`
            : `${e.start} to ${e.end}`;
          return `  - ${e.title} (${timeLabel})`;
        })
        .join("\n");

      return `${entry.userId}:\n${eventLines}`;
    })
    .join("\n\n");
}
