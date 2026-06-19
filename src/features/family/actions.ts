"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  createFamilyGroup,
  getMyFamilyGroup,
  inviteMember,
  removeMember,
  AuthorizationError,
  ValidationError,
} from "@/features/family/services";

// ---------------------------------------------------------------------------
// Server Actions for the family feature
//
// These actions wrap the service layer with auth/session resolution. They
// return Promise<void> so they can be used directly as <form action={...}>
// in both server and client components. Errors are thrown; Next.js surfaces
// them to the user via the nearest error boundary.
// ---------------------------------------------------------------------------

export async function createFamilyGroupAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be signed in.");
  }

  const name = formData.get("name");
  if (typeof name !== "string") {
    throw new Error("Family group name is required.");
  }

  try {
    await createFamilyGroup({ userId: session.user.id, name });
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new Error(error.message);
    }
    throw error;
  }

  redirect("/family");
}

export async function inviteMemberAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be signed in.");
  }

  const familyGroupId = formData.get("familyGroupId");
  const email = formData.get("email");

  if (typeof familyGroupId !== "string" || typeof email !== "string") {
    throw new Error("Invalid request.");
  }

  const inviterName = session.user.name ?? session.user.email ?? "A family member";
  const familyGroup = await getMyFamilyGroup(session.user.id);
  const familyName = familyGroup?.name ?? "your family";

  try {
    await inviteMember({
      userId: session.user.id,
      familyGroupId,
      email,
      inviterName,
      familyName,
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw new Error(error.message);
    }
    throw error;
  }

  redirect("/family");
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be signed in.");
  }

  const familyGroupId = formData.get("familyGroupId");
  const memberUserId = formData.get("memberUserId");

  if (typeof familyGroupId !== "string" || typeof memberUserId !== "string") {
    throw new Error("Invalid request.");
  }

  try {
    await removeMember({
      userId: session.user.id,
      familyGroupId,
      memberUserId,
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw new Error(error.message);
    }
    throw error;
  }

  redirect("/family");
}