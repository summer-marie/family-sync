import "server-only";

import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email/send-invite-email";

// ---------------------------------------------------------------------------
// Error types
//
// AuthorizationError: thrown when a user lacks membership or required role.
//   The service always fails closed for these cases per AGENTS.md.
// ValidationError: thrown when input is invalid (empty name, bad email,
//   duplicate invite, already-in-a-group, no matching invite).
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
// Helpers
// ---------------------------------------------------------------------------

// Simple email validation sufficient for MVP. Not RFC-complete but covers the
// test cases: rejects empty strings and malformed addresses.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): void {
  if (!email || !EMAIL_REGEX.test(email)) {
    throw new ValidationError("A valid email address is required.");
  }
}

/**
 * Assert that the caller is a member of the given family group and has the
 * required role. Fails closed (AuthorizationError) if the caller is not a
 * member or does not meet the role requirement.
 *
 * @param requireOrganizer when true, only ORGANIZER role passes.
 */
async function assertMembership(
  userId: string,
  familyGroupId: string,
  requireOrganizer = false,
): Promise<void> {
  const membership = await prisma.groupMembership.findFirst({
    where: { familyGroupId, userId },
  });

  if (!membership) {
    throw new AuthorizationError(
      "You are not a member of this family group.",
    );
  }

  if (requireOrganizer && membership.role !== "ORGANIZER") {
    throw new AuthorizationError(
      "Only the family organizer can perform this action.",
    );
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Create a new family group. The creator becomes the ORGANIZER.
 *
 * MVP rule: a user can belong to at most one family group. This is enforced
 * at the DB level via @@unique([userId]) on GroupMembership, and checked here
 * before attempting creation so the error is user-friendly.
 */
export async function createFamilyGroup(input: {
  userId: string;
  name: string;
}): Promise<{ familyGroup: { id: string; name: string } }> {
  const trimmedName = input.name.trim();

  if (!trimmedName) {
    throw new ValidationError("Family group name is required.");
  }

  // Check if the user already belongs to a group (MVP: one group per user).
  const existingMembership = await prisma.groupMembership.findFirst({
    where: { userId: input.userId },
  });

  if (existingMembership) {
    throw new ValidationError(
      "You already belong to a family group.",
    );
  }

  const familyGroup = await prisma.familyGroup.create({
    data: {
      name: trimmedName,
      memberships: {
        create: {
          userId: input.userId,
          role: "ORGANIZER",
        },
      },
    },
    include: {
      memberships: true,
    },
  });

  return { familyGroup };
}

/**
 * Return the family group the given user belongs to, or null if they have no
 * membership. Per the MVP one-group-per-user rule there is at most one.
 */
export async function getMyFamilyGroup(
  userId: string,
): Promise<{ id: string; name: string } | null> {
  const familyGroup = await prisma.familyGroup.findFirst({
    where: {
      memberships: {
        some: { userId },
      },
    },
    include: {
      memberships: true,
    },
  });

  return familyGroup;
}

/**
 * Return all memberships for a family group. The caller must be a member;
 * non-members are rejected with AuthorizationError (fail closed).
 */
export async function getFamilyGroupMembers(input: {
  userId: string;
  familyGroupId: string;
}) {
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

  return members;
}

/**
 * Create an email-based invite for a family group. Any member of the group
 * can invite. Duplicate invites (same email in the same group) are rejected.
 *
 * After creating the invite, sends an email via Resend. If the email send
 * fails, the error is logged but not re-thrown — the invite record still
 * exists and the organizer can share the link manually if needed.
 */
export async function inviteMember(input: {
  userId: string;
  familyGroupId: string;
  email: string;
  inviterName?: string;
  familyName?: string;
}) {
  validateEmail(input.email);

  await assertMembership(input.userId, input.familyGroupId);

  // Check for an existing pending invite for this email in this group.
  const existingInvite = await prisma.invite.findFirst({
    where: {
      familyGroupId: input.familyGroupId,
      email: input.email,
    },
  });

  if (existingInvite) {
    throw new ValidationError(
      "This email has already been invited to the family group.",
    );
  }

  // Check if the email belongs to someone who is already a member.
  const existingMember = await prisma.groupMembership.findFirst({
    where: {
      familyGroupId: input.familyGroupId,
      user: { email: input.email },
    },
  });

  if (existingMember) {
    throw new ValidationError(
      "This email is already a member of the family group.",
    );
  }

  const invite = await prisma.invite.create({
    data: {
      familyGroupId: input.familyGroupId,
      email: input.email,
      role: "MEMBER",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Send invite email. Failure is non-fatal — log and continue.
  // NEXTAUTH_URL must be set explicitly (.env.local for dev, Vercel env for prod);
  // no code-level fallback so a misconfigured deploy fails loudly here, not silently.
  try {
    const baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) {
      throw new Error("NEXTAUTH_URL is not set");
    }
    const acceptUrl = `${baseUrl}/invite/${invite.token}`;
    await sendInviteEmail({
      to: input.email,
      inviterName: input.inviterName ?? "A family member",
      familyName: input.familyName ?? "your family",
      acceptUrl,
    });
  } catch (err) {
    console.error("[inviteMember] Failed to send invite email:", err);
  }

  return invite;
}

/**
 * Accept an invite by matching the user's email to a pending invite.
 * Creates the membership and deletes the consumed invite.
 *
 * MVP rule: a user can only belong to one group, so acceptance is rejected
 * if the user is already a member of any group.
 */
export async function acceptInvite(input: {
  userId: string;
  email: string;
}) {
  // Look up the invite by email across all groups.
  const invite = await prisma.invite.findFirst({
    where: { email: input.email },
  });

  if (!invite) {
    throw new ValidationError(
      "No pending invite was found for your email address.",
    );
  }

  // Reject if the invite has expired.
  if (invite.expiresAt < new Date()) {
    throw new ValidationError("This invite has expired.");
  }

  // Reject if the user already belongs to a group (MVP: one group per user).
  const existingMembership = await prisma.groupMembership.findFirst({
    where: { userId: input.userId },
  });

  if (existingMembership) {
    throw new ValidationError(
      "You already belong to a family group.",
    );
  }

  const membership = await prisma.groupMembership.create({
    data: {
      familyGroupId: invite.familyGroupId,
      userId: input.userId,
      role: invite.role,
    },
  });

  // Consume the invite so it cannot be reused.
  await prisma.invite.delete({
    where: { id: invite.id },
  });

  return membership;
}

/**
 * Accept an invite by token. Used by the /invite/[token] accept page.
 *
 * Validates that the token exists, has not expired, and has not already been
 * accepted. Creates the membership and marks the invite ACCEPTED.
 *
 * MVP rule: a user can only belong to one group, so acceptance is rejected
 * if the user is already a member of any group.
 */
export async function acceptInviteByToken(input: {
  userId: string;
  token: string;
}) {
  const invite = await prisma.invite.findUnique({
    where: { token: input.token },
  });

  if (!invite) {
    throw new ValidationError("This invite link is invalid or has expired.");
  }

  if (invite.status === "ACCEPTED") {
    throw new ValidationError("This invite has already been accepted.");
  }

  if (invite.expiresAt < new Date()) {
    throw new ValidationError("This invite link is invalid or has expired.");
  }

  const existingMembership = await prisma.groupMembership.findFirst({
    where: { userId: input.userId },
  });

  if (existingMembership) {
    throw new ValidationError("You are already a member of a family group.");
  }

  const membership = await prisma.groupMembership.create({
    data: {
      familyGroupId: invite.familyGroupId,
      userId: input.userId,
      role: invite.role,
    },
  });

  await prisma.invite.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED" },
  });

  return membership;
}

/**
 * Remove a member from a family group. Only the organizer can remove members.
 * The organizer cannot remove themselves, as this would leave the group
 * without an organizer.
 */
export async function removeMember(input: {
  userId: string;
  familyGroupId: string;
  memberUserId: string;
}): Promise<void> {
  await assertMembership(input.userId, input.familyGroupId, true);

  if (input.userId === input.memberUserId) {
    throw new ValidationError(
      "You cannot remove yourself from the family group.",
    );
  }

  // Check that the target member exists before attempting deletion so we
  // throw a clean ValidationError instead of an unhandled Prisma error.
  const targetMembership = await prisma.groupMembership.findFirst({
    where: {
      familyGroupId: input.familyGroupId,
      userId: input.memberUserId,
    },
  });

  if (!targetMembership) {
    throw new ValidationError(
      "That user is not a member of this family group.",
    );
  }

  await prisma.groupMembership.delete({
    where: {
      familyGroupId_userId: {
        familyGroupId: input.familyGroupId,
        userId: input.memberUserId,
      },
    },
  });
}
