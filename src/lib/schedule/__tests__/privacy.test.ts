import { describe, it, expect } from "vitest";
import { applyPrivacyFilter } from "@/lib/schedule/privacy";

const fullEvent = {
  title: "Doctor appointment",
  start: "2024-06-10T09:00:00.000Z",
  end: "2024-06-10T09:30:00.000Z",
  isAllDay: false,
};

describe("applyPrivacyFilter", () => {
  it("returns full event details when visibility is FULL", () => {
    const result = applyPrivacyFilter(fullEvent, "FULL");
    expect(result.title).toBe("Doctor appointment");
  });

  it("replaces title with 'Busy' when visibility is BUSY_ONLY", () => {
    const result = applyPrivacyFilter(fullEvent, "BUSY_ONLY");
    expect(result.title).toBe("Busy");
  });

  it("never leaks the original title text when visibility is BUSY_ONLY", () => {
    const result = applyPrivacyFilter(fullEvent, "BUSY_ONLY");
    expect(JSON.stringify(result)).not.toContain("Doctor appointment");
  });

  it("preserves start and end times regardless of visibility", () => {
    const busy = applyPrivacyFilter(fullEvent, "BUSY_ONLY");
    expect(busy.start).toBe(fullEvent.start);
    expect(busy.end).toBe(fullEvent.end);
  });

  it("preserves isAllDay flag regardless of visibility", () => {
    const allDayEvent = { ...fullEvent, isAllDay: true };
    const busy = applyPrivacyFilter(allDayEvent, "BUSY_ONLY");
    expect(busy.isAllDay).toBe(true);
  });

  it("applies correct filter across a mixed-visibility member list", () => {
    const members = [
      { events: [fullEvent], visibility: "FULL" as const },
      { events: [fullEvent], visibility: "BUSY_ONLY" as const },
    ];
    const results = members.map((m) =>
      m.events.map((e) => applyPrivacyFilter(e, m.visibility))
    );
    expect(results[0][0].title).toBe("Doctor appointment");
    expect(results[1][0].title).toBe("Busy");
  });

  it("does not mutate the original event object", () => {
    const original = { ...fullEvent };
    applyPrivacyFilter(fullEvent, "BUSY_ONLY");
    expect(fullEvent.title).toBe(original.title);
  });

  it("does not mutate the original event object when visibility is FULL", () => {
    const original = { ...fullEvent };
    const result = applyPrivacyFilter(fullEvent, "FULL");
    result.title = "mutated";
    expect(fullEvent.title).toBe(original.title);
  });
});
