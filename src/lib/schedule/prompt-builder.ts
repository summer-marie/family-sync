import "server-only";

import type { FamilyScheduleEntry } from "@/features/calendar/services";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type ConversationMessage = { role: "user" | "assistant"; content: string };

/**
 * buildChatMessages constructs the messages array sent to the AI model.
 * The system prompt is prepended with the family name, schedule summary,
 * and behavioral instructions. Privacy filtering must be applied to
 * `schedule` before calling — the builder trusts the input is already filtered.
 */
export function buildChatMessages({
  familyName,
  schedule,
  messages,
}: {
  familyName: string;
  schedule: FamilyScheduleEntry[];
  messages: ConversationMessage[];
}): ChatMessage[] {
  const summary = buildScheduleSummary(schedule);

  const systemContent = `You are a scheduling assistant for the ${familyName} family.
You have access to the family's calendar data for the next 90 days.
Each family member's events are listed with their name, event title, and start time.
Events marked as "Busy" have no title — a family member has chosen to keep that event private. Do not speculate about what those events are.
Answer any scheduling question naturally and helpfully.
If someone asks something clearly unrelated to scheduling, respond warmly and redirect them: let them know you can only help with the family schedule.
Never invent events, availability, or times that are not in the data provided.
If the schedule data shows no events for a member, say they appear to have nothing scheduled — do not claim they are definitely free.
If a member's calendar shows as unavailable or not connected, tell the user explicitly that their calendar data is not available and you cannot answer questions about their availability.

Family schedule:
${summary}`;

  return [{ role: "system", content: systemContent }, ...messages];
}

function buildScheduleSummary(schedule: FamilyScheduleEntry[]): string {
  if (schedule.length === 0) {
    return "No schedule data available.";
  }

  return schedule
    .map((entry) => {
      const label = entry.name ?? entry.userId;

      if (entry.status === "unavailable") {
        return `${label}: calendar unavailable`;
      }

      if (entry.events.length === 0) {
        return `${label}: no events`;
      }

      const eventLines = entry.events
        .map((e) => {
          const timeLabel = e.isAllDay
            ? `all day ${e.start}`
            : `${e.start} to ${e.end}`;
          return `  - ${e.title} (${timeLabel})`;
        })
        .join("\n");

      return `${label}:\n${eventLines}`;
    })
    .join("\n\n");
}
