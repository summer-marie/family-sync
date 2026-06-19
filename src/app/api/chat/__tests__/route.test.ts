// ---------------------------------------------------------------------------
// Spec 006 - AI Chat Refactor: chat route integration tests (RED)
//
// Tests the rewritten POST /api/chat handler that accepts:
//   { messages: Array<{role, content}>, familyGroupId: string,
//     familyName?: string, schedule?: FamilyScheduleEntry[] }
//
// Key changes from the old contract:
//   - `question` string replaced by `messages` array
//   - `schedule` may be provided in body (session cache) → skip 90-day fetch
//   - No parseQuestion gate — every question goes to the model
//   - streamText receives the full messages array from buildChatMessages
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/features/calendar/services", () => ({
  getFamilySchedule: vi.fn(),
  AuthorizationError: class AuthorizationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "AuthorizationError";
    }
  },
}));

vi.mock("@/lib/schedule/prompt-builder", () => ({
  buildChatMessages: vi.fn(() => [
    { role: "system", content: "You are a scheduling assistant for the Smith family." },
    { role: "user", content: "Is everyone free Friday?" },
  ]),
}));

vi.mock("ai", () => ({
  streamText: vi.fn(() => ({
    toTextStreamResponse: vi.fn(() => new Response("streamed", { status: 200 })),
  })),
}));

import { auth as _auth } from "@/auth";
import {
  getFamilySchedule as _getFamilySchedule,
  AuthorizationError,
} from "@/features/calendar/services";
import { streamText as _streamText } from "ai";
import { buildChatMessages as _buildChatMessages } from "@/lib/schedule/prompt-builder";

const auth = _auth as unknown as ReturnType<typeof vi.fn>;
const getFamilySchedule = _getFamilySchedule as unknown as ReturnType<typeof vi.fn>;
const streamText = _streamText as unknown as ReturnType<typeof vi.fn>;
const buildChatMessages = _buildChatMessages as unknown as ReturnType<typeof vi.fn>;

import { POST } from "@/app/api/chat/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockSession = {
  user: { id: "user-1", email: "user@test.com", name: "Test User" },
};

const mockSchedule = [
  {
    userId: "user-1",
    status: "connected" as const,
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

const validMessages = [{ role: "user" as const, content: "Is everyone free Friday?" }];

beforeEach(() => {
  vi.resetAllMocks();
  getFamilySchedule.mockResolvedValue(mockSchedule);
  streamText.mockReturnValue({
    toTextStreamResponse: vi.fn(() => new Response("streamed", { status: 200 })),
  });
  buildChatMessages.mockReturnValue([
    { role: "system", content: "You are a scheduling assistant for the Smith family." },
    { role: "user", content: "Is everyone free Friday?" },
  ]);
});

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

describe("POST /api/chat — authentication", () => {
  it("returns 401 when the user is not authenticated", async () => {
    auth.mockResolvedValue(null);

    const res = await POST(
      makeRequest({ messages: validMessages, familyGroupId: "family-1", familyName: "Smith" }),
    );

    expect(res.status).toBe(401);
  });

  it("returns 401 when the session has no user id", async () => {
    auth.mockResolvedValue({ user: {} });

    const res = await POST(
      makeRequest({ messages: validMessages, familyGroupId: "family-1", familyName: "Smith" }),
    );

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

describe("POST /api/chat — request validation", () => {
  it("returns 400 when messages is missing from the body", async () => {
    auth.mockResolvedValue(mockSession);

    const res = await POST(makeRequest({ familyGroupId: "family-1", familyName: "Smith" }));

    expect(res.status).toBe(400);
  });

  it("returns 400 when messages is not an array", async () => {
    auth.mockResolvedValue(mockSession);

    const res = await POST(
      makeRequest({ messages: "Is everyone free?", familyGroupId: "family-1", familyName: "Smith" }),
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 when messages is an empty array", async () => {
    auth.mockResolvedValue(mockSession);

    const res = await POST(
      makeRequest({ messages: [], familyGroupId: "family-1", familyName: "Smith" }),
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 when familyGroupId is missing from the body", async () => {
    auth.mockResolvedValue(mockSession);

    const res = await POST(makeRequest({ messages: validMessages, familyName: "Smith" }));

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

describe("POST /api/chat — authorization", () => {
  it("returns 403 when the user is not a member of the specified family group", async () => {
    auth.mockResolvedValue(mockSession);
    getFamilySchedule.mockRejectedValue(
      new AuthorizationError("Not a member of this family group."),
    );

    const res = await POST(
      makeRequest({ messages: validMessages, familyGroupId: "other-family", familyName: "Smith" }),
    );

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Happy path — messages array
// ---------------------------------------------------------------------------

describe("POST /api/chat — happy path", () => {
  it("calls streamText with system as a top-level string and messages containing only user/assistant turns", async () => {
    auth.mockResolvedValue(mockSession);

    await POST(
      makeRequest({
        messages: validMessages,
        familyGroupId: "family-1",
        familyName: "Smith",
        schedule: mockSchedule,
      }),
    );

    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.any(String),
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "user" }),
        ]),
      }),
    );
    expect(streamText).not.toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "system" }),
        ]),
      }),
    );
  });

  it("skips getFamilySchedule when schedule is provided in the request body", async () => {
    auth.mockResolvedValue(mockSession);

    await POST(
      makeRequest({
        messages: validMessages,
        familyGroupId: "family-1",
        familyName: "Smith",
        schedule: mockSchedule,
      }),
    );

    expect(getFamilySchedule).not.toHaveBeenCalled();
  });

  it("calls getFamilySchedule when schedule is not provided in the request body", async () => {
    auth.mockResolvedValue(mockSession);

    await POST(
      makeRequest({
        messages: validMessages,
        familyGroupId: "family-1",
        familyName: "Smith",
      }),
    );

    expect(getFamilySchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        familyGroupId: "family-1",
      }),
    );
  });

  it("returns a streaming response on success", async () => {
    auth.mockResolvedValue(mockSession);

    const res = await POST(
      makeRequest({
        messages: validMessages,
        familyGroupId: "family-1",
        familyName: "Smith",
        schedule: mockSchedule,
      }),
    );

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Privacy
// ---------------------------------------------------------------------------

describe("POST /api/chat — privacy", () => {
  it("passes schedule through to buildChatMessages so privacy filtering is preserved", async () => {
    auth.mockResolvedValue(mockSession);

    const busySchedule = [
      {
        userId: "bob",
        status: "connected" as const,
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

    await POST(
      makeRequest({
        messages: validMessages,
        familyGroupId: "family-1",
        familyName: "Smith",
        schedule: busySchedule,
      }),
    );

    expect(buildChatMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: busySchedule,
      }),
    );
  });
});
