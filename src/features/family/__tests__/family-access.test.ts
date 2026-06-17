import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the prisma client so integration tests are self-contained and do not
// require a live database connection. Each test configures mock return values.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    familyGroup: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    groupMembership: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    invite: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma as _prisma } from "@/lib/prisma";

// Cast the mocked prisma client so TypeScript recognizes vi.fn() methods.
// At runtime, vi.mock("@/lib/prisma") replaces the real client with vi.fn()
// stubs. This cast aligns the static types with the mock structure.
const prisma = _prisma as unknown as {
  familyGroup: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  groupMembership: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  invite: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

import {
  createFamilyGroup,
  getMyFamilyGroup,
  getFamilyGroupMembers,
  inviteMember,
  acceptInvite,
  removeMember,
  AuthorizationError,
  ValidationError,
} from "@/features/family/services";

// Shared factory helpers for mock data
const mockUser = {
  id: "user-1",
  email: "organizer@example.com",
  name: "Organizer",
  emailVerified: null,
  image: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const mockOtherUser = {
  id: "user-2",
  email: "member@example.com",
  name: "Member",
  emailVerified: null,
  image: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const mockFamilyGroup = {
  id: "family-1",
  name: "The Smiths",
  createdAt: new Date("2024-06-01"),
  updatedAt: new Date("2024-06-01"),
};

const mockOrganizerMembership = {
  id: "mem-1",
  familyGroupId: "family-1",
  userId: "user-1",
  role: "ORGANIZER" as const,
  createdAt: new Date("2024-06-01"),
};

const mockMemberMembership = {
  id: "mem-2",
  familyGroupId: "family-1",
  userId: "user-2",
  role: "MEMBER" as const,
  createdAt: new Date("2024-06-02"),
};

const mockInvite = {
  id: "invite-1",
  familyGroupId: "family-1",
  email: "newperson@example.com",
  role: "MEMBER" as const,
  createdAt: new Date("2024-06-03"),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
};

beforeEach(() => {
  // resetAllMocks clears both call history AND implementations so
  // no state leaks between tests (clearAllMocks only clears history).
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// createFamilyGroup
// ---------------------------------------------------------------------------

describe("createFamilyGroup", () => {
  it("creates a family group and makes the creator the ORGANIZER", async () => {
    prisma.groupMembership.findFirst.mockResolvedValue(null);
    prisma.familyGroup.create.mockResolvedValue({
      ...mockFamilyGroup,
      memberships: [mockOrganizerMembership],
    });

    const result = await createFamilyGroup({
      userId: mockUser.id,
      name: "The Smiths",
    });

    expect(prisma.familyGroup.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "The Smiths",
          memberships: {
            create: expect.objectContaining({
              userId: mockUser.id,
              role: "ORGANIZER",
            }),
          },
        }),
      }),
    );
    expect(result.familyGroup.name).toBe("The Smiths");
  });

  it("rejects creation if the user already belongs to a family group", async () => {
    prisma.groupMembership.findFirst.mockResolvedValue(mockOrganizerMembership);

    await expect(
      createFamilyGroup({ userId: mockUser.id, name: "Second Group" }),
    ).rejects.toThrow(ValidationError);

    expect(prisma.familyGroup.create).not.toHaveBeenCalled();
  });

  it("rejects creation with an empty name", async () => {
    await expect(
      createFamilyGroup({ userId: mockUser.id, name: "  " }),
    ).rejects.toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// getMyFamilyGroup
// ---------------------------------------------------------------------------

describe("getMyFamilyGroup", () => {
  it("returns the family group for a user who has a membership", async () => {
    prisma.familyGroup.findFirst.mockResolvedValue({
      ...mockFamilyGroup,
      memberships: [mockOrganizerMembership, mockMemberMembership],
    });

    const result = await getMyFamilyGroup(mockUser.id);

    expect(result).not.toBeNull();
    expect(result?.id).toBe("family-1");
  });

  it("returns null when the user belongs to no group", async () => {
    prisma.familyGroup.findFirst.mockResolvedValue(null);

    const result = await getMyFamilyGroup(mockUser.id);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getFamilyGroupMembers
// ---------------------------------------------------------------------------

describe("getFamilyGroupMembers", () => {
  it("returns the member list for a user who is a member of the group", async () => {
    prisma.groupMembership.findFirst
      .mockResolvedValueOnce(mockOrganizerMembership) // caller membership check
      .mockResolvedValueOnce(mockOrganizerMembership); // return value
    prisma.groupMembership.findMany.mockResolvedValue([
      mockOrganizerMembership,
      mockMemberMembership,
    ]);

    const result = await getFamilyGroupMembers({
      userId: mockUser.id,
      familyGroupId: "family-1",
    });

    expect(result).toHaveLength(2);
    expect(result[0].userId).toBe("user-1");
    expect(result[1].userId).toBe("user-2");
  });

  it("fails closed when the user is not a member of the group", async () => {
    prisma.groupMembership.findFirst.mockResolvedValue(null);

    await expect(
      getFamilyGroupMembers({
        userId: "user-outsider",
        familyGroupId: "family-1",
      }),
    ).rejects.toThrow(AuthorizationError);

    expect(prisma.groupMembership.findMany).not.toHaveBeenCalled();
  });

  it("fails closed when the group does not exist", async () => {
    prisma.groupMembership.findFirst.mockResolvedValue(null);

    await expect(
      getFamilyGroupMembers({
        userId: mockUser.id,
        familyGroupId: "nonexistent-group",
      }),
    ).rejects.toThrow(AuthorizationError);
  });
});

// ---------------------------------------------------------------------------
// inviteMember
// ---------------------------------------------------------------------------

describe("inviteMember", () => {
  beforeEach(() => {
    prisma.groupMembership.findFirst.mockResolvedValue(mockOrganizerMembership);
    prisma.invite.findFirst.mockResolvedValue(null);
    prisma.invite.create.mockResolvedValue(mockInvite);
  });

  it("creates an invite for a valid email when the caller is the organizer", async () => {
    // Call 1: assertMembership (caller is organizer)
    // Call 2: existing member check (null = not a member)
    prisma.groupMembership.findFirst
      .mockResolvedValueOnce(mockOrganizerMembership)
      .mockResolvedValueOnce(null);

    const result = await inviteMember({
      userId: mockUser.id,
      familyGroupId: "family-1",
      email: "newperson@example.com",
    });

    expect(prisma.invite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          familyGroupId: "family-1",
          email: "newperson@example.com",
          role: "MEMBER",
        }),
      }),
    );
    expect(result.email).toBe("newperson@example.com");
  });

  it("rejects an invalid email address", async () => {
    await expect(
      inviteMember({
        userId: mockUser.id,
        familyGroupId: "family-1",
        email: "not-an-email",
      }),
    ).rejects.toThrow(ValidationError);

    expect(prisma.invite.create).not.toHaveBeenCalled();
  });

  it("rejects an empty email address", async () => {
    await expect(
      inviteMember({
        userId: mockUser.id,
        familyGroupId: "family-1",
        email: "",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects a duplicate invite when the email is already invited", async () => {
    prisma.invite.findFirst.mockResolvedValue(mockInvite);

    await expect(
      inviteMember({
        userId: mockUser.id,
        familyGroupId: "family-1",
        email: "newperson@example.com",
      }),
    ).rejects.toThrow(ValidationError);

    expect(prisma.invite.create).not.toHaveBeenCalled();
  });

  it("fails closed when the caller is not a member of the group", async () => {
    prisma.groupMembership.findFirst.mockResolvedValue(null);

    await expect(
      inviteMember({
        userId: "user-outsider",
        familyGroupId: "family-1",
        email: "newperson@example.com",
      }),
    ).rejects.toThrow(AuthorizationError);

    expect(prisma.invite.create).not.toHaveBeenCalled();
  });

  it("rejects invitation when the caller is a MEMBER, not ORGANIZER", async () => {
    prisma.groupMembership.findFirst.mockResolvedValue(mockMemberMembership);

    await expect(
      inviteMember({
        userId: mockOtherUser.id,
        familyGroupId: "family-1",
        email: "newperson@example.com",
      }),
    ).rejects.toThrow(AuthorizationError);

    expect(prisma.invite.create).not.toHaveBeenCalled();
  });

  it("rejects inviting an email that is already a group member", async () => {
    // Second findFirst call checks for existing membership by email
    prisma.groupMembership.findFirst
      .mockResolvedValueOnce(mockOrganizerMembership) // caller auth check
      .mockResolvedValueOnce(mockMemberMembership); // existing member check

    await expect(
      inviteMember({
        userId: mockUser.id,
        familyGroupId: "family-1",
        email: "member@example.com",
      }),
    ).rejects.toThrow(ValidationError);

    expect(prisma.invite.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// acceptInvite
// ---------------------------------------------------------------------------

describe("acceptInvite", () => {
  it("creates a membership when a user accepts an invite matching their email", async () => {
    prisma.invite.findFirst.mockResolvedValue(mockInvite);
    prisma.groupMembership.findFirst.mockResolvedValue(null);
    prisma.groupMembership.create.mockResolvedValue(mockMemberMembership);
    prisma.invite.delete.mockResolvedValue(mockInvite);

    const result = await acceptInvite({
      userId: mockOtherUser.id,
      email: "newperson@example.com",
    });

    expect(prisma.groupMembership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          familyGroupId: "family-1",
          userId: mockOtherUser.id,
          role: "MEMBER",
        }),
      }),
    );
    expect(result.userId).toBe("user-2");
  });

  it("rejects acceptance when no invite exists for the user email", async () => {
    prisma.invite.findFirst.mockResolvedValue(null);

    await expect(
      acceptInvite({
        userId: mockOtherUser.id,
        email: "uninvited@example.com",
      }),
    ).rejects.toThrow(ValidationError);

    expect(prisma.groupMembership.create).not.toHaveBeenCalled();
  });

  it("rejects acceptance when the user already belongs to a group", async () => {
    prisma.invite.findFirst.mockResolvedValue(mockInvite);
    prisma.groupMembership.findFirst.mockResolvedValue(mockMemberMembership);

    await expect(
      acceptInvite({
        userId: mockOtherUser.id,
        email: "newperson@example.com",
      }),
    ).rejects.toThrow(ValidationError);

    expect(prisma.groupMembership.create).not.toHaveBeenCalled();
  });

  it("rejects acceptance when the invite has expired", async () => {
    const expiredInvite = {
      ...mockInvite,
      expiresAt: new Date("2020-01-01"), // in the past
    };
    prisma.invite.findFirst.mockResolvedValue(expiredInvite);
    prisma.groupMembership.findFirst.mockResolvedValue(null);

    await expect(
      acceptInvite({
        userId: mockOtherUser.id,
        email: "newperson@example.com",
      }),
    ).rejects.toThrow(ValidationError);

    expect(prisma.groupMembership.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// removeMember
// ---------------------------------------------------------------------------

describe("removeMember", () => {
  beforeEach(() => {
    prisma.groupMembership.findFirst.mockResolvedValue(mockOrganizerMembership);
  });

  it("removes a member when requested by the organizer", async () => {
    // First findFirst: assertMembership (caller is organizer)
    // Second findFirst: target member exists
    prisma.groupMembership.findFirst
      .mockResolvedValueOnce(mockOrganizerMembership)
      .mockResolvedValueOnce(mockMemberMembership);
    prisma.groupMembership.delete.mockResolvedValue(mockMemberMembership);

    await removeMember({
      userId: mockUser.id,
      familyGroupId: "family-1",
      memberUserId: mockOtherUser.id,
    });

    expect(prisma.groupMembership.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          familyGroupId_userId: {
            familyGroupId: "family-1",
            userId: mockOtherUser.id,
          },
        }),
      }),
    );
  });

  it("fails closed when the caller is not a member of the group", async () => {
    prisma.groupMembership.findFirst.mockResolvedValue(null);

    await expect(
      removeMember({
        userId: "user-outsider",
        familyGroupId: "family-1",
        memberUserId: mockOtherUser.id,
      }),
    ).rejects.toThrow(AuthorizationError);

    expect(prisma.groupMembership.delete).not.toHaveBeenCalled();
  });

  it("rejects removal when the caller is a MEMBER, not ORGANIZER", async () => {
    prisma.groupMembership.findFirst.mockResolvedValue(mockMemberMembership);

    await expect(
      removeMember({
        userId: mockOtherUser.id,
        familyGroupId: "family-1",
        memberUserId: "user-3",
      }),
    ).rejects.toThrow(AuthorizationError);

    expect(prisma.groupMembership.delete).not.toHaveBeenCalled();
  });

  it("rejects when the organizer tries to remove themselves", async () => {
    // assertMembership passes, then the self-removal guard throws
    prisma.groupMembership.findFirst.mockResolvedValue(mockOrganizerMembership);

    await expect(
      removeMember({
        userId: mockUser.id,
        familyGroupId: "family-1",
        memberUserId: mockUser.id,
      }),
    ).rejects.toThrow(ValidationError);

    expect(prisma.groupMembership.delete).not.toHaveBeenCalled();
  });

  it("rejects when the target member does not exist in the group", async () => {
    // First findFirst: assertMembership (caller is organizer) - passes
    // Second findFirst: target member exists check - returns null
    prisma.groupMembership.findFirst
      .mockResolvedValueOnce(mockOrganizerMembership)
      .mockResolvedValueOnce(null);

    await expect(
      removeMember({
        userId: mockUser.id,
        familyGroupId: "family-1",
        memberUserId: "nonexistent-user",
      }),
    ).rejects.toThrow(ValidationError);

    expect(prisma.groupMembership.delete).not.toHaveBeenCalled();
  });
});
