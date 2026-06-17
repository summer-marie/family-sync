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
 * Create or update the shared note for a family group.
 *
 * MVP rule: one note per family group, enforced by the @unique constraint on
 * familyGroupId in the SharedNote model. saveNote upserts so callers do not
 * need to distinguish create from update.
 *
 * Authorization: the caller must be a member of the family group. Non-members
 * are rejected with AuthorizationError (fail closed per AGENTS.md).
 *
 * Empty content is accepted — clearing the note is a valid action.
 */
export async function saveNote(input: {
  userId: string;
  familyGroupId: string;
  content: string;
}) {
  await assertMembership(input.userId, input.familyGroupId);

  return prisma.sharedNote.upsert({
    where: { familyGroupId: input.familyGroupId },
    create: {
      familyGroupId: input.familyGroupId,
      content: input.content,
      updatedByUserId: input.userId,
    },
    update: {
      content: input.content,
      updatedByUserId: input.userId,
    },
  });
}
