import "server-only";

import { prisma } from "@/lib/prisma";
import { getGoogleAccessToken } from "@/lib/google/get-access-token";
import { listCalendarEvents } from "@/lib/google/calendar";
import { normalizeEvents } from "@/lib/schedule/normalize";
import { applyPrivacyFilter } from "@/lib/schedule/privacy";
import type { ScheduleEvent, Visibility } from "@/lib/schedule/privacy";

// ---------------------------------------------------------------------------
// Error types
//
// AuthorizationError: thrown when a user lacks membership in the family group
//   whose schedule is being requested. The service always fails closed for
//   these cases per AGENTS.md.
// ValidationError: thrown when input is invalid (duplicate connection,
//   missing connection to update, etc.).
// ---------------------------------------------------------------------------

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectionStatus = "CONNECTED" | "DISCONNECTED" | "ERROR";

// Per-member schedule entry returned by getFamilySchedule. The status is
// lowercase to distinguish the derived view state ("connected",
// "unavailable") from the persisted connection enum (CONNECTED, etc.).
export type FamilyScheduleEntry = {
  userId: string;
  status: "connected" | "unavailable";
  events: ScheduleEvent[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Assert that the caller is a member of the given family group. Fails closed
 * (AuthorizationError) if they are not.
 */
async function assertMembership(
  userId: string,
  familyGroupId: string,
): Promise<void> {
  const membership = await prisma.groupMembership.findFirst({
    where: { familyGroupId, userId },
  });

  if (!membership) {
    throw new AuthorizationError(
      "You are not a member of this family group.",
    );
  }
}

// ---------------------------------------------------------------------------
// Connection lifecycle
// ---------------------------------------------------------------------------

/**
 * Create a CONNECTED Google Calendar connection for a user. Rejects if the
 * user already has a google connection (MVP: one connection per provider).
 */
export async function createConnection(input: {
  userId: string;
}): Promise<{
  id: string;
  userId: string;
  provider: string;
  status: ConnectionStatus;
  lastConnectedAt: Date;
}> {
  const existing = await prisma.calendarConnection.findFirst({
    where: { userId: input.userId, provider: "google" },
  });

  if (existing) {
    throw new ValidationError(
      "You already have a connected Google Calendar.",
    );
  }

  const connection = await prisma.calendarConnection.create({
    data: {
      userId: input.userId,
      provider: "google",
      status: "CONNECTED",
      lastConnectedAt: new Date(),
    },
  });

  return connection;
}

/**
 * Return the user's google connection, or null if they have none.
 */
export async function getConnectionForUser(userId: string): Promise<{
  id: string;
  userId: string;
  provider: string;
  status: ConnectionStatus;
  visibility: Visibility;
  lastConnectedAt: Date;
} | null> {
  const connection = await prisma.calendarConnection.findFirst({
    where: { userId, provider: "google" },
  });

  return connection;
}

/**
 * Transition a connection to a new status. Rejects if the user has no
 * connection to update.
 */
export async function updateConnectionStatus(input: {
  userId: string;
  status: ConnectionStatus;
}): Promise<{
  id: string;
  userId: string;
  provider: string;
  status: ConnectionStatus;
  lastConnectedAt: Date;
}> {
  const existing = await prisma.calendarConnection.findFirst({
    where: { userId: input.userId, provider: "google" },
  });

  if (!existing) {
    throw new ValidationError(
      "No calendar connection found to update.",
    );
  }

  const updated = await prisma.calendarConnection.update({
    where: { id: existing.id },
    data: { status: input.status },
  });

  return updated;
}

/**
 * Reconnect: reset status to CONNECTED and bump lastConnectedAt.
 * Used after the user re-authenticates via Google OAuth.
 */
export async function reconnect(input: {
  userId: string;
}): Promise<{
  id: string;
  userId: string;
  provider: string;
  status: ConnectionStatus;
  lastConnectedAt: Date;
}> {
  const existing = await prisma.calendarConnection.findFirst({
    where: { userId: input.userId, provider: "google" },
  });

  if (!existing) {
    throw new ValidationError(
      "No calendar connection found to reconnect.",
    );
  }

  const updated = await prisma.calendarConnection.update({
    where: { id: existing.id },
    data: {
      status: "CONNECTED",
      lastConnectedAt: new Date(),
    },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Shared family schedule (pull-on-demand)
// ---------------------------------------------------------------------------

/**
 * Build the shared family schedule by pulling calendar events on demand for
 * every connected member.
 *
 * Privacy and resilience rules:
 * - The caller must be a member of the family group (fail closed).
 * - Members with no connection, a DISCONNECTED connection, or an ERROR
 *   connection return a privacy-safe `unavailable` entry with no events.
 *   No Google API call is made for those members.
 * - If the Google API throws for a connected member, that member degrades to
 *   `unavailable` rather than crashing or leaking partial data.
 *
 * MVP constraints:
 * - No background sync, no webhooks, no Neon mirror. Each read hits Google
 *   live for connected members only.
 * - Visibility (FULL vs BUSY_ONLY) is applied separately in Step 4 and is
 *   not part of this function's contract for Step 3.
 */
export async function getFamilySchedule(input: {
  userId: string;
  familyGroupId: string;
  timeMin: string;
  timeMax: string;
}): Promise<FamilyScheduleEntry[]> {
  // Authorization: fail closed for non-members.
  await assertMembership(input.userId, input.familyGroupId);

  const members = await prisma.groupMembership.findMany({
    where: { familyGroupId: input.familyGroupId },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const entries: FamilyScheduleEntry[] = [];

  for (const member of members) {
    const entry = await buildMemberScheduleEntry(
      member.userId,
      input.timeMin,
      input.timeMax,
    );
    entries.push(entry);
  }

  return entries;
}

/**
 * Build a single member's schedule entry. Pulls events live from Google only
 * when the member has a CONNECTED connection. All other states degrade to a
 * privacy-safe `unavailable` entry with no events and no Google call.
 */
async function buildMemberScheduleEntry(
  userId: string,
  timeMin: string,
  timeMax: string,
): Promise<FamilyScheduleEntry> {
  const connection = await prisma.calendarConnection.findFirst({
    where: { userId, provider: "google" },
  });

  const unavailable: FamilyScheduleEntry = {
    userId,
    status: "unavailable",
    events: [],
  };

  // No connection, DISCONNECTED, or ERROR: degrade without calling Google.
  if (!connection || connection.status !== "CONNECTED") {
    return unavailable;
  }

  try {
    const accessToken = await getGoogleAccessToken(userId);
    const rawEvents = await listCalendarEvents(accessToken, timeMin, timeMax);
    const events = normalizeEvents(rawEvents);

    // Apply the member's visibility setting before returning. This is the
    // mandatory privacy boundary: no calendar-derived output leaves this
    // service without going through applyPrivacyFilter (AGENTS.md).
    const filtered = events.map((event) =>
      applyPrivacyFilter(event, connection.visibility as Visibility),
    );

    return {
      userId,
      status: "connected",
      events: filtered,
    };
  } catch {
    // Privacy-safe degradation: never leak partial data, never crash the
    // shared schedule because one member's calendar read failed.
    return unavailable;
  }
}