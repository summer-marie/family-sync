// ---------------------------------------------------------------------------
// Spec 006 - AI Chat Refactor: prompt-builder unit tests (RED)
//
// Tests for the rewritten buildChatMessages that accepts
// { familyName, schedule, messages } and returns a messages array
// with the system prompt prepended.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { buildChatMessages } from "@/lib/schedule/prompt-builder";
import type { FamilyScheduleEntry } from "@/features/calendar/services";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const basicSchedule: FamilyScheduleEntry[] = [
  {
    userId: "alice",
    status: "connected",
    events: [
      {
        title: "Dentist",
        start: "2024-06-10T10:00:00Z",
        end: "2024-06-10T11:00:00Z",
        isAllDay: false,
      },
    ],
  },
];

const busySchedule: FamilyScheduleEntry[] = [
  {
    userId: "bob",
    status: "connected",
    events: [
      {
        title: "Busy",
        start: "2024-06-10T14:00:00Z",
        end: "2024-06-10T15:00:00Z",
        isAllDay: false,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// System prompt content
// ---------------------------------------------------------------------------

describe("buildChatMessages — system prompt", () => {
  it("includes the family name in the system prompt", () => {
    const result = buildChatMessages({
      familyName: "Smith",
      schedule: [],
      messages: [{ role: "user", content: "Who is free Saturday?" }],
    });

    const system = result.find((m) => m.role === "system");
    expect(system?.content).toContain("Smith");
  });

  it("includes a privacy instruction about Busy events", () => {
    const result = buildChatMessages({
      familyName: "Jones",
      schedule: [],
      messages: [{ role: "user", content: "Any plans this week?" }],
    });

    const system = result.find((m) => m.role === "system");
    expect(system?.content).toContain("Busy");
    // Must instruct model not to speculate about private events
    expect(system?.content.toLowerCase()).toMatch(/private|speculate|not.{0,20}speculate/i);
  });

  it("serializes connected member schedule data into the system context", () => {
    const result = buildChatMessages({
      familyName: "Doe",
      schedule: basicSchedule,
      messages: [{ role: "user", content: "What does Alice have Monday?" }],
    });

    const system = result.find((m) => m.role === "system");
    expect(system?.content).toContain("alice");
    expect(system?.content).toContain("Dentist");
  });

  it("handles unavailable members without throwing", () => {
    const unavailableSchedule: FamilyScheduleEntry[] = [
      { userId: "carol", status: "unavailable", events: [] },
    ];

    expect(() =>
      buildChatMessages({
        familyName: "Test",
        schedule: unavailableSchedule,
        messages: [{ role: "user", content: "Is Carol free?" }],
      }),
    ).not.toThrow();
  });

  it("produces a safe system prompt when the schedule is empty", () => {
    const result = buildChatMessages({
      familyName: "Empty",
      schedule: [],
      messages: [{ role: "user", content: "Is everyone free?" }],
    });

    const system = result.find((m) => m.role === "system");
    expect(system?.content).not.toMatch(/undefined|null/);
    // Prompt must acknowledge absence of data rather than invent availability
    expect(system?.content.toLowerCase()).toMatch(/no (events|schedule|data)/);
  });
});

// ---------------------------------------------------------------------------
// Messages array structure
// ---------------------------------------------------------------------------

describe("buildChatMessages — messages array structure", () => {
  it("returns the system prompt as the first message", () => {
    const result = buildChatMessages({
      familyName: "Lee",
      schedule: [],
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(result[0].role).toBe("system");
  });

  it("appends user and assistant turns after the system prompt", () => {
    const messages = [
      { role: "user" as const, content: "Is anyone free Friday?" },
      { role: "assistant" as const, content: "Yes, everyone is free." },
      { role: "user" as const, content: "What about Saturday?" },
    ];

    const result = buildChatMessages({
      familyName: "Park",
      schedule: [],
      messages,
    });

    expect(result).toHaveLength(4); // system + 3 turns
    expect(result[1]).toEqual(messages[0]);
    expect(result[2]).toEqual(messages[1]);
    expect(result[3]).toEqual(messages[2]);
  });
});
