// ---------------------------------------------------------------------------
// Spec 005 - Shared Family Notes: service layer integration tests (RED)
//
// These tests cover saveNote in @/features/notes/services, which does not
// exist yet. All tests are expected to fail (RED) until the service is built.
//
// Service contract under test:
//   saveNote({ userId, familyGroupId, content })
//     - member: upserts the shared note, returns the saved note
//     - non-member: throws AuthorizationError (fail closed)
//     - empty content: treated as valid, saved without error
//
// Mocked at: @/lib/prisma (groupMembership.findFirst, sharedNote.upsert)
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the prisma client so these tests are self-contained and do not require
// a live database connection. Each test configures mock return values.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    groupMembership: {
      findFirst: vi.fn(),
    },
    sharedNote: {
      upsert: vi.fn(),
    },
  },
}));

import { prisma as _prisma } from "@/lib/prisma";

// Cast the mocked client so TypeScript recognizes vi.fn() methods.
const prisma = _prisma as unknown as {
  groupMembership: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  sharedNote: {
    upsert: ReturnType<typeof vi.fn>;
  };
};

import { saveNote, AuthorizationError } from "@/features/notes/services";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

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
  updatedAt: new Date("2024-01-01"),
  updatedByUserId: "user-1",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("notes service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveNote", () => {
    it("member can create a shared note", async () => {
      prisma.groupMembership.findFirst.mockResolvedValue(mockMembership);
      prisma.sharedNote.upsert.mockResolvedValue({
        ...mockNote,
        content: "Shopping list: milk, eggs",
      });

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
      expect(prisma.sharedNote.upsert).toHaveBeenCalledOnce();
    });

    it("member can edit the shared note", async () => {
      prisma.groupMembership.findFirst.mockResolvedValue(mockMembership);
      prisma.sharedNote.upsert.mockResolvedValue({
        ...mockNote,
        content: "Updated: milk, eggs, butter",
      });

      const result = await saveNote({
        userId: "user-1",
        familyGroupId: "group-1",
        content: "Updated: milk, eggs, butter",
      });

      expect(result).toMatchObject({ content: "Updated: milk, eggs, butter" });
      expect(prisma.sharedNote.upsert).toHaveBeenCalledOnce();
    });

    it("non-member is denied with AuthorizationError", async () => {
      prisma.groupMembership.findFirst.mockResolvedValue(null);

      await expect(
        saveNote({ userId: "user-99", familyGroupId: "group-1", content: "Hello" }),
      ).rejects.toThrow(AuthorizationError);

      expect(prisma.sharedNote.upsert).not.toHaveBeenCalled();
    });

    it("empty content is saved without error", async () => {
      prisma.groupMembership.findFirst.mockResolvedValue(mockMembership);
      prisma.sharedNote.upsert.mockResolvedValue({ ...mockNote, content: "" });

      await expect(
        saveNote({ userId: "user-1", familyGroupId: "group-1", content: "" }),
      ).resolves.toMatchObject({ content: "" });

      expect(prisma.sharedNote.upsert).toHaveBeenCalledOnce();
    });
  });
});
