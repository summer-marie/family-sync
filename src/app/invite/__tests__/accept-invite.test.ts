import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma so tests run without a live DB connection.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    invite: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    groupMembership: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma as _prisma } from "@/lib/prisma";

// acceptInviteByToken is the new token-based service function created in
// Stop 3. It replaces the email-based acceptInvite for the URL flow.
import { acceptInviteByToken, ValidationError } from "@/features/family/services";

const prisma = _prisma as unknown as {
  invite: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  groupMembership: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

const mockInvite = {
  id: "invite-1",
  familyGroupId: "family-1",
  email: "invited@example.com",
  role: "MEMBER" as const,
  token: "tok-abc-123",
  status: "PENDING" as const,
  createdAt: new Date("2024-06-03"),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};

const mockMembership = {
  id: "mem-2",
  familyGroupId: "family-1",
  userId: "user-2",
  role: "MEMBER" as const,
  createdAt: new Date("2024-06-04"),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("acceptInviteByToken", () => {
  it("creates a membership and marks the invite ACCEPTED for a valid token and authenticated user with no existing group", async () => {
    prisma.invite.findUnique.mockResolvedValue(mockInvite);
    prisma.groupMembership.findFirst.mockResolvedValue(null);
    prisma.groupMembership.create.mockResolvedValue(mockMembership);
    prisma.invite.update.mockResolvedValue({ ...mockInvite, status: "ACCEPTED" });

    const result = await acceptInviteByToken({
      userId: "user-2",
      token: "tok-abc-123",
    });

    expect(prisma.groupMembership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          familyGroupId: "family-1",
          userId: "user-2",
          role: "MEMBER",
        }),
      }),
    );
    expect(prisma.invite.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invite-1" },
        data: { status: "ACCEPTED" },
      }),
    );
    expect(result.familyGroupId).toBe("family-1");
  });

  it("returns an error state when the token does not exist", async () => {
    prisma.invite.findUnique.mockResolvedValue(null);

    await expect(
      acceptInviteByToken({ userId: "user-2", token: "nonexistent-token" }),
    ).rejects.toThrow(ValidationError);

    expect(prisma.groupMembership.create).not.toHaveBeenCalled();
  });

  it("returns an error state when the token has expired", async () => {
    const expiredInvite = {
      ...mockInvite,
      expiresAt: new Date("2020-01-01"),
    };
    prisma.invite.findUnique.mockResolvedValue(expiredInvite);
    prisma.groupMembership.findFirst.mockResolvedValue(null);

    await expect(
      acceptInviteByToken({ userId: "user-2", token: "tok-abc-123" }),
    ).rejects.toThrow(ValidationError);

    expect(prisma.groupMembership.create).not.toHaveBeenCalled();
  });

  it("returns an error state when the token has already been accepted", async () => {
    const acceptedInvite = { ...mockInvite, status: "ACCEPTED" as const };
    prisma.invite.findUnique.mockResolvedValue(acceptedInvite);
    prisma.groupMembership.findFirst.mockResolvedValue(null);

    await expect(
      acceptInviteByToken({ userId: "user-2", token: "tok-abc-123" }),
    ).rejects.toThrow(ValidationError);

    expect(prisma.groupMembership.create).not.toHaveBeenCalled();
  });

  it("returns an already-in-group error state when the user already belongs to a family group", async () => {
    prisma.invite.findUnique.mockResolvedValue(mockInvite);
    prisma.groupMembership.findFirst.mockResolvedValue({
      id: "mem-existing",
      familyGroupId: "other-family",
      userId: "user-2",
      role: "MEMBER",
      createdAt: new Date(),
    });

    await expect(
      acceptInviteByToken({ userId: "user-2", token: "tok-abc-123" }),
    ).rejects.toThrow(ValidationError);

    expect(prisma.groupMembership.create).not.toHaveBeenCalled();
  });
});
