import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub the Prisma client so no live database is required.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    account: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma as _prisma } from "@/lib/prisma";
import { getGoogleAccessToken } from "@/lib/google/get-access-token";

const prisma = _prisma as unknown as {
  account: {
    findFirst: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getGoogleAccessToken", () => {
  it("returns the access_token when a Google account exists", async () => {
    prisma.account.findFirst.mockResolvedValue({
      access_token: "ya29.valid_token",
    });

    const result = await getGoogleAccessToken("user-1");

    expect(result).toBe("ya29.valid_token");
    expect(prisma.account.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", provider: "google" },
        select: { access_token: true },
      }),
    );
  });

  it("throws when no Google account exists for the user", async () => {
    prisma.account.findFirst.mockResolvedValue(null);

    await expect(getGoogleAccessToken("user-1")).rejects.toThrow(
      "No Google access token found for user",
    );
  });

  it("throws when the account exists but has a null access_token", async () => {
    prisma.account.findFirst.mockResolvedValue({
      access_token: null,
    });

    await expect(getGoogleAccessToken("user-1")).rejects.toThrow(
      "No Google access token found for user",
    );
  });

  it("throws when the account exists but access_token is undefined", async () => {
    prisma.account.findFirst.mockResolvedValue({});

    await expect(getGoogleAccessToken("user-1")).rejects.toThrow(
      "No Google access token found for user",
    );
  });

  it("does not return account fields other than access_token", async () => {
    prisma.account.findFirst.mockResolvedValue({
      access_token: "token",
      // These should NOT be selected or returned.
      id: "acct-1",
      userId: "user-1",
      provider: "google",
    });

    const result = await getGoogleAccessToken("user-1");

    expect(result).toBe("token");
    expect(prisma.account.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { access_token: true },
      }),
    );
  });
});