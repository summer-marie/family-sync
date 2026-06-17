import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { saveNote, AuthorizationError } from "@/features/notes/services";

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: { familyGroupId?: unknown; content?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const familyGroupId =
    typeof body.familyGroupId === "string" ? body.familyGroupId : "";
  const content = typeof body.content === "string" ? body.content : null;

  if (!familyGroupId) {
    return NextResponse.json(
      { error: "familyGroupId is required" },
      { status: 400 },
    );
  }

  if (content === null) {
    return NextResponse.json(
      { error: "content must be a string" },
      { status: 400 },
    );
  }

  try {
    await saveNote({ userId, familyGroupId, content });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
}
