// ---------------------------------------------------------------------------
// Spec 002 - Calendar Connection integration tests (RED)
//
// These tests define the public API and behavior of the calendar connection
// service before it exists. The module under test
// (src/features/calendar/services.ts) has not been implemented yet, so every
// test fails because the import does not resolve. That is the correct RED
// reason: behavior is absent, not a typo or bad path.
//
// Coverage:
// - createConnection persists a CONNECTED connection
// - getConnectionForUser returns the connection or null
// - updateConnectionStatus transitions status
// - reconnect resets to CONNECTED and bumps lastConnectedAt
// - getFamilySchedule aggregates events, skips unconnected members, degrades
//   to privacy-safe unavailable on failure, rejects non-members, and passes
//   the requested time window to the Google client.
//
// Mocks:
// - @/lib/prisma is stubbed so no live database is required.
// - @/lib/google/get-access-token is stubbed so no real token lookup runs.
// - @/lib/google/calendar is stubbed so no real Google API call runs.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub the Prisma client. Each test configures mock return values.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    calendarConnection: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    groupMembership: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Stub the Google access token lookup so the service never touches the real
// Account table through this path.
vi.mock("@/lib/google/get-access-token", () => ({
  getGoogleAccessToken: vi.fn(),
}));

// Stub the Google Calendar client so no real API call is made. The service is
// expected to call listCalendarEvents(accessToken, timeMin, timeMax) which
// returns raw Google Calendar event objects.
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
    findUnique: ReturnType<typeof vi.fn>;
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

import {
  createConnection,
  getConnectionForUser,
  updateConnectionStatus,
  reconnect,
  getFamilySchedule,
  AuthorizationError,
} from "@/features/calendar/services";

// ---------------------------------------------------------------------------
// Shared factory data
// ---------------------------------------------------------------------------

const mockUser = { id: "user-1", email: "organizer@example.com", name: "Organizer" };
const mockOtherUser = { id: "user-2", email: "member@example.com", name: "Member" };

const mockOrganizerMembership = {
  id: "mem-1",
  familyGroupId: "family-1",
  userId: "user-1",
  role: "ORGANIZER" as const,
  createdAt: new Date("2024-06-01"),
};

const mockMemberMembership = {
  id: "mem-2",
  familyGroupId: "family-1",
  userId: "user-2",
  role: "MEMBER" as const,
  createdAt: new Date("2024-06-02"),
};

const mockConnection = {
  id: "conn-1",
  userId: "user-1",
  provider: "google",
  status: "CONNECTED" as const,
  lastConnectedAt: new Date("2024-06-01"),
  createdAt: new Date("2024-06-01"),
  updatedAt: new Date("2024-06-01"),
};

const mockDisconnectedConnection = {
  ...mockConnection,
  id: "conn-2",
  userId: "user-2",
  status: "DISCONNECTED" as const,
};

const mockErrorConnection = {
  ...mockConnection,
  id: "conn-3",
  userId: "user-2",
  status: "ERROR" as const,
};

// Raw Google Calendar event shape as returned by listCalendarEvents.
const rawGoogleEvents = [
  {
    id: "evt-1",
    summary: "Soccer practice",
    start: { dateTime: "2024-06-10T10:00:00-07:00" },
    end: { dateTime: "2024-06-10T11:00:00-07:00" },
  },
  {
    id: "evt-2",
    summary: null,
    start: { dateTime: "2024-06-10T14:00:00-07:00" },
    end: { dateTime: "2024-06-10T15:00:00-07:00" },
  },
];

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// createConnection
// ---------------------------------------------------------------------------

describe("createConnection", () => {
  it("persists a CONNECTED google connection for the user", async () => {
    prisma.calendarConnection.findFirst.mockResolvedValue(null);
    prisma.calendarConnection.create.mockResolvedValue(mockConnection);

    const result = await createConnection({ userId: mockUser.id });

    expect(prisma.calendarConnection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: mockUser.id,
          provider: "google",
          status: "CONNECTED",
        }),
      }),
    );
    expect(result.status).toBe("CONNECTED");
    expect(result.userId).toBe(mockUser.id);
  });

  it("rejects creation if the user already has a google connection", async () => {
    prisma.calendarConnection.findFirst.mockResolvedValue(mockConnection);

    await expect(createConnection({ userId: mockUser.id })).rejects.toThrow();

    expect(prisma.calendarConnection.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getConnectionForUser
// ---------------------------------------------------------------------------

describe("getConnectionForUser", () => {
  it("returns the user's connection when one exists", async () => {
    prisma.calendarConnection.findFirst.mockResolvedValue(mockConnection);

    const result = await getConnectionForUser(mockUser.id);

    expect(prisma.calendarConnection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: mockUser.id, provider: "google" }),
      }),
    );
    expect(result?.id).toBe("conn-1");
    expect(result?.status).toBe("CONNECTED");
  });

  it("returns null when the user has no connection", async () => {
    prisma.calendarConnection.findFirst.mockResolvedValue(null);

    const result = await getConnectionForUser(mockUser.id);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateConnectionStatus
// ---------------------------------------------------------------------------

describe("updateConnectionStatus", () => {
  it("transitions a connection from CONNECTED to DISCONNECTED", async () => {
    prisma.calendarConnection.findFirst.mockResolvedValue(mockConnection);
    prisma.calendarConnection.update.mockResolvedValue({
      ...mockConnection,
      status: "DISCONNECTED",
    });

    const result = await updateConnectionStatus({
      userId: mockUser.id,
      status: "DISCONNECTED",
    });

    expect(prisma.calendarConnection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: mockConnection.id }),
        data: expect.objectContaining({ status: "DISCONNECTED" }),
      }),
    );
    expect(result.status).toBe("DISCONNECTED");
  });

  it("transitions a connection to ERROR", async () => {
    prisma.calendarConnection.findFirst.mockResolvedValue(mockConnection);
    prisma.calendarConnection.update.mockResolvedValue({
      ...mockConnection,
      status: "ERROR",
    });

    const result = await updateConnectionStatus({
      userId: mockUser.id,
      status: "ERROR",
    });

    expect(result.status).toBe("ERROR");
  });

  it("rejects when the user has no connection to update", async () => {
    prisma.calendarConnection.findFirst.mockResolvedValue(null);

    await expect(
      updateConnectionStatus({ userId: mockUser.id, status: "ERROR" }),
    ).rejects.toThrow();

    expect(prisma.calendarConnection.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// reconnect
// ---------------------------------------------------------------------------

describe("reconnect", () => {
  it("resets status to CONNECTED and bumps lastConnectedAt", async () => {
    const disconnected = { ...mockConnection, status: "DISCONNECTED" as const };
    prisma.calendarConnection.findFirst.mockResolvedValue(disconnected);

    const freshTimestamp = new Date("2024-06-05");
    prisma.calendarConnection.update.mockResolvedValue({
      ...mockConnection,
      status: "CONNECTED",
      lastConnectedAt: freshTimestamp,
    });

    const result = await reconnect({ userId: mockUser.id });

    expect(prisma.calendarConnection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "CONNECTED",
        }),
      }),
    );
    expect(result.status).toBe("CONNECTED");
    // lastConnectedAt should have advanced from the original 2024-06-01.
    expect(result.lastConnectedAt.getTime()).toBeGreaterThan(
      disconnected.lastConnectedAt.getTime(),
    );
  });
});

// ---------------------------------------------------------------------------
// getFamilySchedule
// ---------------------------------------------------------------------------

describe("getFamilySchedule", () => {
  const timeMin = "2024-06-10T00:00:00-07:00";
  const timeMax = "2024-06-11T00:00:00-07:00";

  it("aggregates events across connected members and skips members with no connection", async () => {
    // Auth check: caller is a member.
    prisma.groupMembership.findFirst.mockResolvedValueOnce(mockOrganizerMembership);
    prisma.groupMembership.findMany.mockResolvedValue([
      mockOrganizerMembership,
      mockMemberMembership,
    ]);
    // Organizer has a connection; member does not.
    prisma.calendarConnection.findFirst
      .mockResolvedValueOnce(mockConnection) // organizer
      .mockResolvedValueOnce(null); // member

    getGoogleAccessToken.mockResolvedValue("token-1");
    listCalendarEvents.mockResolvedValue(rawGoogleEvents);

    const result = await getFamilySchedule({
      userId: mockUser.id,
      familyGroupId: "family-1",
      timeMin,
      timeMax,
    });

    // Two members in the result.
    expect(result).toHaveLength(2);

    const organizerEntry = result.find((e) => e.userId === "user-1");
    const memberEntry = result.find((e) => e.userId === "user-2");

    // Organizer: connected, has normalized events.
    expect(organizerEntry?.status).toBe("connected");
    expect(organizerEntry?.events).toHaveLength(2);

    // Member: no connection, privacy-safe unavailable state, no events leaked.
    expect(memberEntry?.status).toBe("unavailable");
    expect(memberEntry?.events).toEqual([]);

    // The Google client was only called once (for the connected organizer).
    expect(listCalendarEvents).toHaveBeenCalledTimes(1);
  });

  it("returns unavailable for DISCONNECTED connections without calling Google", async () => {
    prisma.groupMembership.findFirst.mockResolvedValueOnce(mockOrganizerMembership);
    prisma.groupMembership.findMany.mockResolvedValue([mockMemberMembership]);
    prisma.calendarConnection.findFirst.mockResolvedValueOnce(mockDisconnectedConnection);

    const result = await getFamilySchedule({
      userId: mockUser.id,
      familyGroupId: "family-1",
      timeMin,
      timeMax,
    });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("unavailable");
    expect(result[0].events).toEqual([]);

    // No Google calls for a disconnected member.
    expect(getGoogleAccessToken).not.toHaveBeenCalled();
    expect(listCalendarEvents).not.toHaveBeenCalled();
  });

  it("returns unavailable for ERROR connections without calling Google", async () => {
    prisma.groupMembership.findFirst.mockResolvedValueOnce(mockOrganizerMembership);
    prisma.groupMembership.findMany.mockResolvedValue([mockMemberMembership]);
    prisma.calendarConnection.findFirst.mockResolvedValueOnce(mockErrorConnection);

    const result = await getFamilySchedule({
      userId: mockUser.id,
      familyGroupId: "family-1",
      timeMin,
      timeMax,
    });

    expect(result[0].status).toBe("unavailable");
    expect(listCalendarEvents).not.toHaveBeenCalled();
  });

  it("fails closed when the caller is not a member of the family group", async () => {
    prisma.groupMembership.findFirst.mockResolvedValue(null);

    await expect(
      getFamilySchedule({
        userId: "user-outsider",
        familyGroupId: "family-1",
        timeMin,
        timeMax,
      }),
    ).rejects.toThrow(AuthorizationError);

    expect(prisma.groupMembership.findMany).not.toHaveBeenCalled();
    expect(listCalendarEvents).not.toHaveBeenCalled();
  });

  it("passes the requested time window to the Google client", async () => {
    prisma.groupMembership.findFirst.mockResolvedValueOnce(mockOrganizerMembership);
    prisma.groupMembership.findMany.mockResolvedValue([mockOrganizerMembership]);
    prisma.calendarConnection.findFirst.mockResolvedValueOnce(mockConnection);
    getGoogleAccessToken.mockResolvedValue("token-1");
    listCalendarEvents.mockResolvedValue([]);

    await getFamilySchedule({
      userId: mockUser.id,
      familyGroupId: "family-1",
      timeMin,
      timeMax,
    });

    expect(listCalendarEvents).toHaveBeenCalledWith(
      expect.any(String),
      timeMin,
      timeMax,
    );
  });

  it("degrades to unavailable when the Google API throws instead of crashing", async () => {
    prisma.groupMembership.findFirst.mockResolvedValueOnce(mockOrganizerMembership);
    prisma.groupMembership.findMany.mockResolvedValue([mockOrganizerMembership]);
    prisma.calendarConnection.findFirst.mockResolvedValueOnce(mockConnection);
    getGoogleAccessToken.mockResolvedValue("token-1");
    listCalendarEvents.mockRejectedValue(new Error("Google API error"));

    const result = await getFamilySchedule({
      userId: mockUser.id,
      familyGroupId: "family-1",
      timeMin,
      timeMax,
    });

    // The member degrades to unavailable; no partial data leaks and no crash.
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("unavailable");
    expect(result[0].events).toEqual([]);
  });
});