// ---------------------------------------------------------------------------
// Shared Family Notes: service layer integration tests
//
// Service contract under test:
//   saveNote({ userId, familyGroupId, content })
//     - member: creates a new shared note card, returns it
//     - non-member: throws AuthorizationError (fail closed)
//     - empty content: treated as valid, saved without error
//   listNotes({ userId, familyGroupId })
//     - member: returns all notes for the group, newest first
//     - non-member: throws AuthorizationError (fail closed)
//
// Mocked at: @/lib/prisma (groupMembership.findFirst, sharedNote.create/findMany)
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    groupMembership: {
      findFirst: vi.fn(),
    },
    sharedNote: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma as _prisma } from "@/lib/prisma";

const prisma = _prisma as unknown as {
  groupMembership: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  sharedNote: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

import {
  saveNote,
  listNotes,
  AuthorizationError,
  ValidationError,
} from "@/features/notes/services";

const mockMembership = {
  id: "mem-1",
  familyGroupId: "group-1",
  userId: "user-1",
  role: "MEMBER" as const,
  createdAt: new Date("2024-01-01"),
};

const mockNote = {
  id: "note-1",
  familyGroupId: "group-1",
  content: "Shopping list: milk, eggs",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  updatedByUserId: "user-1",
};

describe("notes service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveNote", () => {
    it("member can create a shared note card", async () => {
      prisma.groupMembership.findFirst.mockResolvedValue(mockMembership);
      prisma.sharedNote.create.mockResolvedValue({ ...mockNote });

      const result = await saveNote({
        userId: "user-1",
        familyGroupId: "group-1",
        content: "Shopping list: milk, eggs",
      });

      expect(result).toMatchObject({
        familyGroupId: "group-1",
        content: "Shopping list: milk, eggs",
        updatedByUserId: "user-1",
      });
      expect(prisma.sharedNote.create).toHaveBeenCalledOnce();
    });

    it("saving again creates an additional note rather than overwriting", async () => {
      prisma.groupMembership.findFirst.mockResolvedValue(mockMembership);
      prisma.sharedNote.create.mockResolvedValue({
        ...mockNote,
        id: "note-2",
        content: "Second note",
      });

      const result = await saveNote({
        userId: "user-1",
        familyGroupId: "group-1",
        content: "Second note",
      });

      expect(result).toMatchObject({ id: "note-2", content: "Second note" });
      expect(prisma.sharedNote.create).toHaveBeenCalledOnce();
    });

    it("non-member is denied with AuthorizationError", async () => {
      prisma.groupMembership.findFirst.mockResolvedValue(null);

      await expect(
        saveNote({ userId: "user-99", familyGroupId: "group-1", content: "Hello" }),
      ).rejects.toThrow(AuthorizationError);

      expect(prisma.sharedNote.create).not.toHaveBeenCalled();
    });

    it("content over 500 characters is rejected with ValidationError", async () => {
      prisma.groupMembership.findFirst.mockResolvedValue(mockMembership);

      await expect(
        saveNote({
          userId: "user-1",
          familyGroupId: "group-1",
          content: "a".repeat(501),
        }),
      ).rejects.toThrow(ValidationError);

      expect(prisma.sharedNote.create).not.toHaveBeenCalled();
    });

    it("empty content is saved without error", async () => {
      prisma.groupMembership.findFirst.mockResolvedValue(mockMembership);
      prisma.sharedNote.create.mockResolvedValue({ ...mockNote, content: "" });

      await expect(
        saveNote({ userId: "user-1", familyGroupId: "group-1", content: "" }),
      ).resolves.toMatchObject({ content: "" });

      expect(prisma.sharedNote.create).toHaveBeenCalledOnce();
    });
  });

  describe("listNotes", () => {
    it("member can list all notes for the group, newest first", async () => {
      prisma.groupMembership.findFirst.mockResolvedValue(mockMembership);
      prisma.sharedNote.findMany.mockResolvedValue([
        { ...mockNote, id: "note-2", updatedBy: { name: "Sara", email: null } },
        { ...mockNote, id: "note-1", updatedBy: { name: "Ryan", email: null } },
      ]);

      const result = await listNotes({ userId: "user-1", familyGroupId: "group-1" });

      expect(result).toHaveLength(2);
      expect(prisma.sharedNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { familyGroupId: "group-1" },
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("non-member is denied with AuthorizationError", async () => {
      prisma.groupMembership.findFirst.mockResolvedValue(null);

      await expect(
        listNotes({ userId: "user-99", familyGroupId: "group-1" }),
      ).rejects.toThrow(AuthorizationError);

      expect(prisma.sharedNote.findMany).not.toHaveBeenCalled();
    });
  });
});
