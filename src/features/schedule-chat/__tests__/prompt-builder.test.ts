// ---------------------------------------------------------------------------
// Spec 001 - AI Schedule Chat: prompt builder unit tests (RED)
//
// These tests cover buildChatMessages from @/lib/schedule/prompt-builder,
// which does not exist yet. All tests are expected to fail (RED) until the
// prompt builder is implemented.
//
// Coverage:
// - Returns a [system, user] message pair in the Vercel AI SDK CoreMessage shape
// - User message content contains the verbatim question
// - System message instructs the model to answer only from provided schedule data
// - System message instructs the model not to invent events or take actions
// - Connected member events appear in the system message schedule summary
// - Unavailable members are represented safely (no crash, no leaked data)
// - Empty schedule produces a graceful "no data" note in the system message
// - Multiple members all appear in the schedule summary
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { buildChatMessages } from "@/lib/schedule/prompt-builder";
import type { FamilyScheduleEntry } from "@/features/calendar/services";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const question = "Is everyone free Sunday afternoon?";

const twoMemberSchedule: FamilyScheduleEntry[] = [
  {
    userId: "user-1",
    status: "connected",
    events: [
      {
        title: "Doctor appointment",
        start: "2024-06-10T09:00:00-07:00",
        end: "2024-06-10T09:30:00-07:00",
        isAllDay: false,
      },
    ],
  },
  {
    userId: "user-2",
    status: "connected",
    events: [
      {
        // Pre-filtered by applyPrivacyFilter — the builder only sees "Busy".
        title: "Busy",
        start: "2024-06-10T10:00:00-07:00",
        end: "2024-06-10T11:00:00-07:00",
        isAllDay: false,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// buildChatMessages
// ---------------------------------------------------------------------------

describe("buildChatMessages", () => {
  it("returns an array of exactly two messages", () => {
    const messages = buildChatMessages(question, twoMemberSchedule);
    expect(messages).toHaveLength(2);
  });

  it("first message has role 'system' and second has role 'user'", () => {
    const messages = buildChatMessages(question, twoMemberSchedule);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
  });

  it("user message content contains the original question verbatim", () => {
    const messages = buildChatMessages(question, twoMemberSchedule);
    expect(messages[1].content).toContain(question);
  });

  it("system message instructs the model to answer only from the provided schedule data", () => {
    const messages = buildChatMessages(question, twoMemberSchedule);
    const system = messages[0].content as string;
    // Must contain some form of "only answer from" / "only use" / "based only on"
    expect(system).toMatch(/only|answer.*from.*schedule|based.*on.*schedule/i);
  });

  it("system message instructs the model not to invent events or take unsupported actions", () => {
    const messages = buildChatMessages(question, twoMemberSchedule);
    const system = messages[0].content as string;
    // Must contain a prohibition on inventing or taking calendar actions
    expect(system).toMatch(/do not invent|not invent|no.*action|do not.*edit|do not.*create/i);
  });

  it("system message includes event data from connected members", () => {
    const messages = buildChatMessages(question, twoMemberSchedule);
    const system = messages[0].content as string;
    // The FULL-visibility event title must appear
    expect(system).toContain("Doctor appointment");
  });

  it("system message includes the Busy label for privacy-filtered events", () => {
    const messages = buildChatMessages(question, twoMemberSchedule);
    const system = messages[0].content as string;
    expect(system).toContain("Busy");
  });

  it("all member user IDs appear in the system message", () => {
    const messages = buildChatMessages(question, twoMemberSchedule);
    const system = messages[0].content as string;
    expect(system).toContain("user-1");
    expect(system).toContain("user-2");
  });

  it("handles unavailable members without throwing", () => {
    const unavailableSchedule: FamilyScheduleEntry[] = [
      { userId: "user-1", status: "unavailable", events: [] },
    ];
    expect(() => buildChatMessages(question, unavailableSchedule)).not.toThrow();
    const messages = buildChatMessages(question, unavailableSchedule);
    expect(messages[0].role).toBe("system");
  });

  it("produces a graceful 'no data' note in the system message when schedule is empty", () => {
    const messages = buildChatMessages(question, []);
    const system = messages[0].content as string;
    // Must indicate no schedule data is available rather than silently omitting it
    expect(system).toMatch(/no.*schedule|no events|schedule.*unavailable|no data/i);
  });
});
