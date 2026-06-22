import "server-only";

import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Error types
//
// AuthorizationError: thrown when a user is not a member of the family group
//   whose note is being accessed. The service always fails closed per AGENTS.md.
// ---------------------------------------------------------------------------

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// Service functions
// ---------------------------------------------------------------------------

/**
 * Create a new shared note card for a family group. A family group can have
 * many notes — each save adds a new note rather than overwriting a prior one.
 *
 * Authorization: the caller must be a member of the family group. Non-members
 * are rejected with AuthorizationError (fail closed per AGENTS.md).
 *
 * Empty content is accepted — an empty note is a valid card.
 */
export async function saveNote(input: {
  userId: string;
  familyGroupId: string;
  content: string;
}) {
  await assertMembership(input.userId, input.familyGroupId);

  return prisma.sharedNote.create({
    data: {
      familyGroupId: input.familyGroupId,
      content: input.content,
      updatedByUserId: input.userId,
    },
  });
}

/**
 * List all shared note cards for a family group, newest first.
 *
 * Authorization: the caller must be a member of the family group. Non-members
 * are rejected with AuthorizationError (fail closed per AGENTS.md).
 */
export async function listNotes(input: {
  userId: string;
  familyGroupId: string;
}) {
  await assertMembership(input.userId, input.familyGroupId);

  return prisma.sharedNote.findMany({
    where: { familyGroupId: input.familyGroupId },
    orderBy: { createdAt: "desc" },
    include: { updatedBy: { select: { name: true, email: true } } },
  });
}
