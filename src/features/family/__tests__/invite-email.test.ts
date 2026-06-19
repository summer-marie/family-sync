import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma so tests are self-contained with no live DB connection.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    groupMembership: {
      findFirst: vi.fn(),
    },
    invite: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

// Mock the email sender — it doesn't exist yet and will be created in Stop 3.
vi.mock("@/lib/email/send-invite-email", () => ({
  sendInviteEmail: vi.fn(),
}));

import { prisma as _prisma } from "@/lib/prisma";
import { sendInviteEmail as _sendInviteEmail } from "@/lib/email/send-invite-email";
import { inviteMember, ValidationError } from "@/features/family/services";

const prisma = _prisma as unknown as {
  groupMembership: { findFirst: ReturnType<typeof vi.fn> };
  invite: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
};

const sendInviteEmail = _sendInviteEmail as unknown as ReturnType<typeof vi.fn>;

const mockOrganizerMembership = {
  id: "mem-1",
  familyGroupId: "family-1",
  userId: "user-1",
  role: "ORGANIZER" as const,
  createdAt: new Date("2024-06-01"),
};

const mockInvite = {
  id: "invite-1",
  familyGroupId: "family-1",
  email: "newperson@example.com",
  role: "MEMBER" as const,
  token: "tok-abc-123",
  status: "PENDING" as const,
  createdAt: new Date("2024-06-03"),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("inviteMember — email sending", () => {
  it("calls sendInviteEmail with correct to, inviterName, familyName, and acceptUrl after creating the invite", async () => {
    prisma.groupMembership.findFirst
      .mockResolvedValueOnce(mockOrganizerMembership) // assertMembership
      .mockResolvedValueOnce(null); // existing member check
    prisma.invite.findFirst.mockResolvedValue(null);
    prisma.invite.create.mockResolvedValue(mockInvite);
    sendInviteEmail.mockResolvedValue(undefined);

    await inviteMember({
      userId: "user-1",
      familyGroupId: "family-1",
      email: "newperson@example.com",
      inviterName: "Organizer",
      familyName: "The Smiths",
    });

    expect(sendInviteEmail).toHaveBeenCalledOnce();
    expect(sendInviteEmail).toHaveBeenCalledWith({
      to: "newperson@example.com",
      inviterName: "Organizer",
      familyName: "The Smiths",
      acceptUrl: expect.stringContaining("tok-abc-123"),
    });
  });

  it("uses the token from the created invite in the acceptUrl so each invite link is unique", async () => {
    const invite1 = { ...mockInvite, token: "tok-111" };
    const invite2 = { ...mockInvite, id: "invite-2", email: "other@example.com", token: "tok-222" };

    prisma.groupMembership.findFirst.mockResolvedValue(mockOrganizerMembership);
    prisma.invite.findFirst.mockResolvedValue(null);
    sendInviteEmail.mockResolvedValue(undefined);

    prisma.invite.create.mockResolvedValueOnce(invite1);
    await inviteMember({
      userId: "user-1",
      familyGroupId: "family-1",
      email: "newperson@example.com",
      inviterName: "Organizer",
      familyName: "The Smiths",
    });
    const firstUrl: string = sendInviteEmail.mock.calls[0][0].acceptUrl;

    vi.resetAllMocks();
    prisma.groupMembership.findFirst.mockResolvedValue(mockOrganizerMembership);
    prisma.invite.findFirst.mockResolvedValue(null);
    sendInviteEmail.mockResolvedValue(undefined);

    prisma.invite.create.mockResolvedValueOnce(invite2);
    await inviteMember({
      userId: "user-1",
      familyGroupId: "family-1",
      email: "other@example.com",
      inviterName: "Organizer",
      familyName: "The Smiths",
    });
    const secondUrl: string = sendInviteEmail.mock.calls[0][0].acceptUrl;

    expect(firstUrl).toContain("tok-111");
    expect(secondUrl).toContain("tok-222");
    expect(firstUrl).not.toBe(secondUrl);
  });

  it("does not throw when sendInviteEmail fails — invite record is still created", async () => {
    prisma.groupMembership.findFirst
      .mockResolvedValueOnce(mockOrganizerMembership)
      .mockResolvedValueOnce(null);
    prisma.invite.findFirst.mockResolvedValue(null);
    prisma.invite.create.mockResolvedValue(mockInvite);
    sendInviteEmail.mockRejectedValue(new Error("Resend API unavailable"));

    await expect(
      inviteMember({
        userId: "user-1",
        familyGroupId: "family-1",
        email: "newperson@example.com",
        inviterName: "Organizer",
        familyName: "The Smiths",
      }),
    ).resolves.not.toThrow();

    expect(prisma.invite.create).toHaveBeenCalled();
  });

  it("duplicate invite for same email and group is still rejected before email is sent", async () => {
    prisma.groupMembership.findFirst.mockResolvedValue(mockOrganizerMembership);
    prisma.invite.findFirst.mockResolvedValue(mockInvite);

    await expect(
      inviteMember({
        userId: "user-1",
        familyGroupId: "family-1",
        email: "newperson@example.com",
        inviterName: "Organizer",
        familyName: "The Smiths",
      }),
    ).rejects.toThrow(ValidationError);

    expect(prisma.invite.create).not.toHaveBeenCalled();
    expect(sendInviteEmail).not.toHaveBeenCalled();
  });
});
