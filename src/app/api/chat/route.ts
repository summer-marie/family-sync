import { auth } from "@/auth";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  getFamilySchedule,
  AuthorizationError,
} from "@/features/calendar/services";
import { buildChatMessages } from "@/lib/schedule/prompt-builder";

export async function POST(req: Request): Promise<Response> {
  // Step 1: authenticate
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  // Step 2: validate request body
  let body: { question?: unknown; familyGroupId?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request: invalid JSON", { status: 400 });
  }

  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  const familyGroupId =
    typeof body.familyGroupId === "string" ? body.familyGroupId : "";

  if (!question) {
    return new Response("Bad Request: question is required", { status: 400 });
  }

  if (!familyGroupId) {
    return new Response("Bad Request: familyGroupId is required", {
      status: 400,
    });
  }

  // Step 4: load authorized, privacy-filtered schedule data
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let schedule;
  try {
    schedule = await getFamilySchedule({
      userId,
      familyGroupId,
      timeMin: now.toISOString(),
      timeMax: weekLater.toISOString(),
    });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return new Response("Forbidden", { status: 403 });
    }
    return new Response("Internal Server Error", { status: 500 });
  }

  // Step 5-7: build prompt, call model, stream response
  const messages = buildChatMessages(question, schedule);

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages,
  });

  return result.toTextStreamResponse();
}
