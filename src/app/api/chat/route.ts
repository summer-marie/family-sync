import { auth } from "@/auth";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  getFamilySchedule,
  AuthorizationError,
  type FamilyScheduleEntry,
} from "@/features/calendar/services";
import { buildChatMessages } from "@/lib/schedule/prompt-builder";

type ConversationMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  let body: {
    messages?: unknown;
    familyGroupId?: unknown;
    familyName?: unknown;
    schedule?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request: invalid JSON", { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : null;
  const familyGroupId =
    typeof body.familyGroupId === "string" ? body.familyGroupId : "";
  const familyName =
    typeof body.familyName === "string" ? body.familyName : "Family";
  const scheduleFromBody = Array.isArray(body.schedule)
    ? (body.schedule as FamilyScheduleEntry[])
    : null;

  if (!messages || messages.length === 0) {
    return new Response("Bad Request: messages is required", { status: 400 });
  }

  if (!familyGroupId) {
    return new Response("Bad Request: familyGroupId is required", {
      status: 400,
    });
  }

  // Use the session-cached schedule if the client sent it; otherwise fetch 90 days.
  // Privacy filtering runs inside getFamilySchedule — client only ever receives
  // already-filtered data, so the cached copy is safe to reuse.
  let schedule: FamilyScheduleEntry[];
  if (scheduleFromBody) {
    schedule = scheduleFromBody;
  } else {
    const now = new Date();
    const ninetyDaysLater = new Date(
      now.getTime() + 90 * 24 * 60 * 60 * 1000,
    );

    try {
      schedule = await getFamilySchedule({
        userId,
        familyGroupId,
        timeMin: now.toISOString(),
        timeMax: ninetyDaysLater.toISOString(),
      });
    } catch (err) {
      if (err instanceof AuthorizationError) {
        return new Response("Forbidden", { status: 403 });
      }
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  const chatMessages = buildChatMessages({
    familyName,
    schedule,
    messages: messages as ConversationMessage[],
  });

  // Split the system entry out so it goes through the dedicated system option
  // rather than the messages array, which avoids the Vercel AI SDK security warning.
  const [systemEntry, ...conversationMessages] = chatMessages;

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemEntry.content,
    messages: conversationMessages,
    // Hard ceiling so no single response — regardless of cause — can run
    // away unbounded and overwhelm the client.
    maxOutputTokens: 800,
  });

  return result.toTextStreamResponse();
}
