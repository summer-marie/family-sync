// ---------------------------------------------------------------------------
// Spec 001 - AI Schedule Chat: chat route integration tests (RED)
//
// These tests cover the POST handler in @/app/api/chat/route, which does not
// exist yet. All tests are expected to fail (RED) until the route is built.
//
// The route contract under test:
//   POST /api/chat
//   Body: { question: string; familyGroupId: string }
//
// Server-side flow (from AGENTS.md and ai-chat-vercel-notes-repo.md):
//   1. auth()                          → 401 if no session
//   2. validate body                   → 400 if question or familyGroupId missing
//   3. parseQuestion(question)         → return JSON fallback if OUT_OF_SCOPE
//   4. getFamilySchedule(...)          → throws AuthorizationError → 403
//   5. buildChatMessages(...)
//   6. streamText(...)
//   7. return result.toDataStreamResponse()
//
// Mocked at: @/auth, @/features/calendar/services, ai
// These match the same pattern used in privacy-controls.test.ts.
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
    { role: "system", content: "Schedule summary" },
    { role: "user", content: "Is everyone free?" },
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

const auth = _auth as unknown as ReturnType<typeof vi.fn>;
const getFamilySchedule = _getFamilySchedule as unknown as ReturnType<typeof vi.fn>;
const streamText = _streamText as unknown as ReturnType<typeof vi.fn>;

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

beforeEach(() => {
  vi.resetAllMocks();
  getFamilySchedule.mockResolvedValue(mockSchedule);
  streamText.mockReturnValue({
    toTextStreamResponse: vi.fn(() => new Response("streamed", { status: 200 })),
  });
});

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

describe("POST /api/chat - authentication", () => {
  it("returns 401 when the user is not authenticated", async () => {
    auth.mockResolvedValue(null);

    const res = await POST(
      makeRequest({ question: "Is everyone free Sunday?", familyGroupId: "family-1" }),
    );

    expect(res.status).toBe(401);
  });

  it("returns 401 when the session has no user id", async () => {
    auth.mockResolvedValue({ user: {} });

    const res = await POST(
      makeRequest({ question: "Is everyone free Sunday?", familyGroupId: "family-1" }),
    );

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

describe("POST /api/chat - request validation", () => {
  it("returns 400 when question is missing from the body", async () => {
    auth.mockResolvedValue(mockSession);

    const res = await POST(makeRequest({ familyGroupId: "family-1" }));

    expect(res.status).toBe(400);
  });

  it("returns 400 when question is an empty string", async () => {
    auth.mockResolvedValue(mockSession);

    const res = await POST(makeRequest({ question: "", familyGroupId: "family-1" }));

    expect(res.status).toBe(400);
  });

  it("returns 400 when familyGroupId is missing from the body", async () => {
    auth.mockResolvedValue(mockSession);

    const res = await POST(makeRequest({ question: "Is everyone free Sunday?" }));

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

describe("POST /api/chat - authorization", () => {
  it("returns 403 when the user is not a member of the specified family group", async () => {
    auth.mockResolvedValue(mockSession);
    getFamilySchedule.mockRejectedValue(
      new AuthorizationError("You are not a member of this family group."),
    );

    const res = await POST(
      makeRequest({ question: "Is everyone free Sunday?", familyGroupId: "other-family" }),
    );

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Out-of-scope questions
// ---------------------------------------------------------------------------

describe("POST /api/chat - out-of-scope questions", () => {
  it("returns a JSON fallback response for an out-of-scope question without calling streamText", async () => {
    auth.mockResolvedValue(mockSession);

    const res = await POST(
      makeRequest({ question: "Book a flight for me", familyGroupId: "family-1" }),
    );

    // Should not have called the AI at all
    expect(streamText).not.toHaveBeenCalled();
    // Should return a safe message
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("message");
  });
});

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe("POST /api/chat - happy path", () => {
  it("calls getFamilySchedule with the correct userId and familyGroupId", async () => {
    auth.mockResolvedValue(mockSession);

    await POST(
      makeRequest({ question: "Is everyone free Sunday?", familyGroupId: "family-1" }),
    );

    expect(getFamilySchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        familyGroupId: "family-1",
      }),
    );
  });

  it("calls streamText for a supported in-scope question", async () => {
    auth.mockResolvedValue(mockSession);

    await POST(
      makeRequest({ question: "Is everyone free Sunday?", familyGroupId: "family-1" }),
    );

    expect(streamText).toHaveBeenCalled();
  });

  it("returns a streaming response on success", async () => {
    auth.mockResolvedValue(mockSession);

    const res = await POST(
      makeRequest({ question: "Is everyone free Sunday?", familyGroupId: "family-1" }),
    );

    expect(res.status).toBe(200);
  });
});
