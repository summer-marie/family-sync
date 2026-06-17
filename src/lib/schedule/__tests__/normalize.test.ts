import { describe, it, expect } from "vitest";
import { normalizeEvents } from "@/lib/schedule/normalize";

// Minimal fixture matching the Google Calendar API event shape.
const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  id: "evt-1",
  summary: "Team standup",
  start: { dateTime: "2024-06-10T09:00:00-07:00" },
  end: { dateTime: "2024-06-10T09:30:00-07:00" },
  ...overrides,
});

describe("normalizeEvents", () => {
  it("returns a compact summary object for a timed event", () => {
    const result = normalizeEvents([makeEvent()]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "Team standup",
      start: expect.any(String),
      end: expect.any(String),
      isAllDay: false,
    });
  });

  it("returns empty array for empty input", () => {
    expect(normalizeEvents([])).toEqual([]);
  });

  it("marks all-day events with isAllDay true", () => {
    const result = normalizeEvents([
      makeEvent({ start: { date: "2024-06-10" }, end: { date: "2024-06-11" } }),
    ]);
    expect(result[0].isAllDay).toBe(true);
  });

  it("returns start and end as parseable date strings", () => {
    const result = normalizeEvents([makeEvent()]);
    expect(Number.isNaN(new Date(result[0].start).getTime())).toBe(false);
    expect(Number.isNaN(new Date(result[0].end).getTime())).toBe(false);
  });

  it("uses event summary as the title", () => {
    const result = normalizeEvents([makeEvent({ summary: "Doctor appointment" })]);
    expect(result[0].title).toBe("Doctor appointment");
  });

  it("falls back to '(no title)' when summary is missing", () => {
    const result = normalizeEvents([makeEvent({ summary: undefined })]);
    expect(result[0].title).toBe("(no title)");
  });

  it("falls back to '(no title)' when summary is null", () => {
    const result = normalizeEvents([makeEvent({ summary: null })]);
    expect(result[0].title).toBe("(no title)");
  });

  it("prefers dateTime over date when both are present on the start block", () => {
    const dateTime = "2024-06-10T09:00:00-07:00";
    const result = normalizeEvents([
      makeEvent({ start: { dateTime, date: "2024-06-10" } }),
    ]);
    expect(result[0].start).toBe(dateTime);
    expect(result[0].isAllDay).toBe(false);
  });

  it("normalizes multiple events in order", () => {
    const events = [
      makeEvent({ id: "a", summary: "First" }),
      makeEvent({ id: "b", summary: "Second" }),
    ];
    const result = normalizeEvents(events);
    expect(result[0].title).toBe("First");
    expect(result[1].title).toBe("Second");
  });

  describe("skip path — events with unusable timing data", () => {
    it("skips an event with no start field", () => {
      const result = normalizeEvents([makeEvent({ start: undefined })]);
      expect(result).toHaveLength(0);
    });

    it("skips an event with no end field", () => {
      const result = normalizeEvents([makeEvent({ end: undefined })]);
      expect(result).toHaveLength(0);
    });

    it("skips an event where start.dateTime and start.date are both null", () => {
      const result = normalizeEvents([
        makeEvent({ start: { dateTime: null, date: null } }),
      ]);
      expect(result).toHaveLength(0);
    });

    it("skips an event where end.dateTime and end.date are both null", () => {
      const result = normalizeEvents([
        makeEvent({ end: { dateTime: null, date: null } }),
      ]);
      expect(result).toHaveLength(0);
    });

    it("returns only the valid event from a mixed array where one has no end", () => {
      const events = [
        makeEvent({ id: "a", summary: "Valid event" }),
        makeEvent({ id: "b", summary: "No end event", end: undefined }),
      ];
      const result = normalizeEvents(events);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Valid event");
    });
  });
});
