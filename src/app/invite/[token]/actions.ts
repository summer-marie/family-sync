"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  acceptInviteByToken,
  ValidationError,
} from "@/features/family/services";

export async function acceptInviteAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be signed in.");
  }

  const token = formData.get("token");
  if (typeof token !== "string") {
    throw new Error("Invalid request.");
  }

  try {
    await acceptInviteByToken({ userId: session.user.id, token });
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new Error(error.message);
    }
    throw error;
  }

  redirect("/schedule");
}
