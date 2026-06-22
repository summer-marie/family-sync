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
Format responses with markdown: use **bold** for names/event titles and bullet lists when listing multiple events or multiple people. Keep paragraphs short.
If someone asks something clearly unrelated to scheduling, respond warmly and redirect them: let them know you can only help with the family schedule.
Never invent events, availability, or times that are not in the data provided.
If the schedule data shows no events for a member, say they appear to have nothing scheduled — do not claim they are definitely free.
If a member's calendar shows as unavailable or not connected, tell the user explicitly that their calendar data is not available and you cannot answer questions about their availability.

Family schedule:
${summary}`;

  return [{ role: "system", content: systemContent }, ...messages];
}

// Events with this many or more occurrences in the window are summarized as
// a recurring pattern (weekdays + count) instead of listed one line per
// occurrence — keeps the prompt compact even for long recurring series
// (e.g. "Gym Days" 3x/week over 90 days would otherwise be ~38 raw lines).
const RECURRING_THRESHOLD = 5;
const RECURRING_EXAMPLE_COUNT = 3;

function formatEventLine(e: {
  start: string;
  end: string;
  isAllDay: boolean;
}): string {
  return e.isAllDay ? `all day ${e.start}` : `${e.start} to ${e.end}`;
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

      // Group same-titled events together so a recurring series is
      // recognized as one pattern rather than N separate lines.
      const groups = new Map<string, typeof entry.events>();
      for (const event of entry.events) {
        const group = groups.get(event.title);
        if (group) {
          group.push(event);
        } else {
          groups.set(event.title, [event]);
        }
      }

      const lines = Array.from(groups.entries()).map(([title, events]) => {
        const sorted = [...events].sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
        );

        if (sorted.length < RECURRING_THRESHOLD) {
          return sorted
            .map((e) => `  - ${title} (${formatEventLine(e)})`)
            .join("\n");
        }

        const weekdays = Array.from(
          new Set(
            sorted.map((e) =>
              new Date(e.start).toLocaleDateString(undefined, {
                weekday: "short",
              }),
            ),
          ),
        );
        const examples = sorted
          .slice(0, RECURRING_EXAMPLE_COUNT)
          .map((e) => formatEventLine(e))
          .join("; ");

        return `  - ${title}: recurs on ${weekdays.join(", ")} — ${sorted.length} times in the next 90 days (e.g. ${examples})`;
      });

      return `${label}:\n${lines.join("\n")}`;
    })
    .join("\n\n");
}
