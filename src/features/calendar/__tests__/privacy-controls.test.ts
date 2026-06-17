// ---------------------------------------------------------------------------
// Spec 004 - Privacy Controls integration tests (RED)
//
// These tests verify that getFamilySchedule applies the privacy visibility
// filter to each member's events before returning them. The visibility
// setting lives on CalendarConnection (FULL vs BUSY_ONLY) and is applied
// via applyPrivacyFilter from @/lib/schedule/privacy.
//
// Coverage:
// - FULL visibility preserves original event titles
// - BUSY_ONLY visibility replaces all titles with "Busy"
// - BUSY_ONLY never leaks the original title anywhere in the output
// - Timing (start/end/isAllDay) is always preserved regardless of visibility
// - Mixed visibility across group members filters each member independently
// - Visibility is stateless: the next read reflects whatever is in the DB
//
// Mocks: same pattern as calendar-connection.test.ts (Prisma, Google token,
// Google Calendar client all stubbed so no live dependencies are required).
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    calendarConnection: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    groupMembership: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/google/get-access-token", () => ({
  getGoogleAccessToken: vi.fn(),
}));

vi.mock("@/lib/google/calendar", () => ({
  listCalendarEvents: vi.fn(),
  getCalendarClient: vi.fn(),
  getOAuthClient: vi.fn(),
}));

import { prisma as _prisma } from "@/lib/prisma";
import { getGoogleAccessToken as _getGoogleAccessToken } from "@/lib/google/get-access-token";
import { listCalendarEvents as _listCalendarEvents } from "@/lib/google/calendar";

const prisma = _prisma as unknown as {
  calendarConnection: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  groupMembership: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

const getGoogleAccessToken = _getGoogleAccessToken as unknown as ReturnType<typeof vi.fn>;
const listCalendarEvents = _listCalendarEvents as unknown as ReturnType<typeof vi.fn>;

import { getFamilySchedule } from "@/features/calendar/services";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const mockMembership = {
  id: "mem-1",
  familyGroupId: "family-1",
  userId: "user-1",
  role: "ORGANIZER" as const,
  createdAt: new Date("2024-06-01"),
};

const baseConnection = {
  id: "conn-1",
  userId: "user-1",
  provider: "google",
  status: "CONNECTED" as const,
  lastConnectedAt: new Date("2024-06-01"),
  createdAt: new Date("2024-06-01"),
  updatedAt: new Date("2024-06-01"),
};

// Raw Google Calendar events returned by the Google API stub.
// Using a recognisable private title to make privacy-leak assertions obvious.
const rawEvents = [
  {
    id: "evt-1",
    summary: "Doctor appointment",
    start: { dateTime: "2024-06-10T09:00:00-07:00" },
    end: { dateTime: "2024-06-10T09:30:00-07:00" },
  },
  {
    id: "evt-2",
    summary: "School pickup",
    start: { dateTime: "2024-06-10T15:00:00-07:00" },
    end: { dateTime: "2024-06-10T15:30:00-07:00" },
  },
];

const timeMin = "2024-06-10T00:00:00-07:00";
const timeMax = "2024-06-11T00:00:00-07:00";

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Visibility filtering in getFamilySchedule
// ---------------------------------------------------------------------------

describe("getFamilySchedule - visibility filtering (Spec 004)", () => {
  it("preserves original event titles when member visibility is FULL", async () => {
    prisma.groupMembership.findFirst.mockResolvedValueOnce(mockMembership);
    prisma.groupMembership.findMany.mockResolvedValue([mockMembership]);
    prisma.calendarConnection.findFirst.mockResolvedValueOnce({
      ...baseConnection,
      visibility: "FULL",
    });
    getGoogleAccessToken.mockResolvedValue("token-1");
    listCalendarEvents.mockResolvedValue(rawEvents);

    const result = await getFamilySchedule({
      userId: "user-1",
      familyGroupId: "family-1",
      timeMin,
      timeMax,
    });

    const entry = result.find((e) => e.userId === "user-1");
    expect(entry?.status).toBe("connected");
    expect(entry?.events[0].title).toBe("Doctor appointment");
    expect(entry?.events[1].title).toBe("School pickup");
  });

  it("replaces all event titles with Busy when member visibility is BUSY_ONLY", async () => {
    prisma.groupMembership.findFirst.mockResolvedValueOnce(mockMembership);
    prisma.groupMembership.findMany.mockResolvedValue([mockMembership]);
    prisma.calendarConnection.findFirst.mockResolvedValueOnce({
      ...baseConnection,
      visibility: "BUSY_ONLY",
    });
    getGoogleAccessToken.mockResolvedValue("token-1");
    listCalendarEvents.mockResolvedValue(rawEvents);

    const result = await getFamilySchedule({
      userId: "user-1",
      familyGroupId: "family-1",
      timeMin,
      timeMax,
    });

    const entry = result.find((e) => e.userId === "user-1");
    expect(entry?.status).toBe("connected");
    expect(entry?.events).toHaveLength(2);
    expect(entry?.events[0].title).toBe("Busy");
    expect(entry?.events[1].title).toBe("Busy");
  });

  it("never leaks original title text in BUSY_ONLY output", async () => {
    prisma.groupMembership.findFirst.mockResolvedValueOnce(mockMembership);
    prisma.groupMembership.findMany.mockResolvedValue([mockMembership]);
    prisma.calendarConnection.findFirst.mockResolvedValueOnce({
      ...baseConnection,
      visibility: "BUSY_ONLY",
    });
    getGoogleAccessToken.mockResolvedValue("token-1");
    listCalendarEvents.mockResolvedValue(rawEvents);

    const result = await getFamilySchedule({
      userId: "user-1",
      familyGroupId: "family-1",
      timeMin,
      timeMax,
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("Doctor appointment");
    expect(serialized).not.toContain("School pickup");
  });

  it("preserves start/end/isAllDay for BUSY_ONLY events so availability calculations stay accurate", async () => {
    prisma.groupMembership.findFirst.mockResolvedValueOnce(mockMembership);
    prisma.groupMembership.findMany.mockResolvedValue([mockMembership]);
    prisma.calendarConnection.findFirst.mockResolvedValueOnce({
      ...baseConnection,
      visibility: "BUSY_ONLY",
    });
    getGoogleAccessToken.mockResolvedValue("token-1");
    listCalendarEvents.mockResolvedValue([rawEvents[0]]);

    const result = await getFamilySchedule({
      userId: "user-1",
      familyGroupId: "family-1",
      timeMin,
      timeMax,
    });

    const event = result[0].events[0];
    // Title is hidden but timing is intact.
    expect(event.title).toBe("Busy");
    expect(event.start).toBeTruthy();
    expect(event.end).toBeTruthy();
    expect(typeof event.isAllDay).toBe("boolean");
  });

  it("filters each member independently when visibility is mixed across the group", async () => {
    const membershipUser2 = {
      ...mockMembership,
      id: "mem-2",
      userId: "user-2",
      role: "MEMBER" as const,
    };

    prisma.groupMembership.findFirst.mockResolvedValueOnce(mockMembership);
    prisma.groupMembership.findMany.mockResolvedValue([
      mockMembership,
      membershipUser2,
    ]);
    // user-1: FULL visibility
    prisma.calendarConnection.findFirst
      .mockResolvedValueOnce({ ...baseConnection, userId: "user-1", visibility: "FULL" })
      // user-2: BUSY_ONLY visibility
      .mockResolvedValueOnce({ ...baseConnection, id: "conn-2", userId: "user-2", visibility: "BUSY_ONLY" });

    getGoogleAccessToken.mockResolvedValue("token-1");
    listCalendarEvents.mockResolvedValue(rawEvents);

    const result = await getFamilySchedule({
      userId: "user-1",
      familyGroupId: "family-1",
      timeMin,
      timeMax,
    });

    const entry1 = result.find((e) => e.userId === "user-1");
    const entry2 = result.find((e) => e.userId === "user-2");

    // FULL member: real titles visible.
    expect(entry1?.events[0].title).toBe("Doctor appointment");

    // BUSY_ONLY member: titles replaced, no leak.
    expect(entry2?.events[0].title).toBe("Busy");
    const serialized2 = JSON.stringify(entry2);
    expect(serialized2).not.toContain("Doctor appointment");
  });

  it("reflects visibility change on the next read (stateless — no caching)", async () => {
    // First read: visibility is FULL.
    prisma.groupMembership.findFirst.mockResolvedValueOnce(mockMembership);
    prisma.groupMembership.findMany.mockResolvedValue([mockMembership]);
    prisma.calendarConnection.findFirst.mockResolvedValueOnce({
      ...baseConnection,
      visibility: "FULL",
    });
    getGoogleAccessToken.mockResolvedValue("token-1");
    listCalendarEvents.mockResolvedValue(rawEvents);

    const resultFull = await getFamilySchedule({
      userId: "user-1",
      familyGroupId: "family-1",
      timeMin,
      timeMax,
    });

    // Second read: visibility changed to BUSY_ONLY (simulates a DB update).
    prisma.groupMembership.findFirst.mockResolvedValueOnce(mockMembership);
    prisma.groupMembership.findMany.mockResolvedValue([mockMembership]);
    prisma.calendarConnection.findFirst.mockResolvedValueOnce({
      ...baseConnection,
      visibility: "BUSY_ONLY",
    });
    getGoogleAccessToken.mockResolvedValue("token-1");
    listCalendarEvents.mockResolvedValue(rawEvents);

    const resultBusy = await getFamilySchedule({
      userId: "user-1",
      familyGroupId: "family-1",
      timeMin,
      timeMax,
    });

    expect(resultFull[0].events[0].title).toBe("Doctor appointment");
    expect(resultBusy[0].events[0].title).toBe("Busy");
  });
});
