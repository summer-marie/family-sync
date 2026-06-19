import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Resend client — src/lib/resend.ts doesn't exist yet and will be
// created in Stop 3. The mock provides a resend.emails.send stub.
vi.mock("@/lib/resend", () => ({
  resend: {
    emails: {
      send: vi.fn(),
    },
  },
}));

import { resend as _resend } from "@/lib/resend";
import { sendInviteEmail } from "@/lib/email/send-invite-email";

const resend = _resend as unknown as {
  emails: { send: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.resetAllMocks();
  resend.emails.send.mockResolvedValue({ id: "email-id-123" });
});

describe("sendInviteEmail", () => {
  const baseArgs = {
    to: "invited@example.com",
    inviterName: "Summer",
    familyName: "The Halsey Family",
    acceptUrl: "http://localhost:3000/invite/tok-abc-123",
  };

  it("calls resend.emails.send with the correct to, subject, and from fields", async () => {
    await sendInviteEmail(baseArgs);

    expect(resend.emails.send).toHaveBeenCalledOnce();
    const call = resend.emails.send.mock.calls[0][0];
    expect(call.to).toBe("invited@example.com");
    expect(call.subject).toBeTruthy();
    expect(call.from).toBeTruthy();
  });

  it("includes the accept URL in the email text", async () => {
    await sendInviteEmail(baseArgs);

    const { text } = resend.emails.send.mock.calls[0][0];
    expect(text).toContain("http://localhost:3000/invite/tok-abc-123");
  });

  it("includes the inviter name in the email text", async () => {
    await sendInviteEmail(baseArgs);

    const { text } = resend.emails.send.mock.calls[0][0];
    expect(text).toContain("Summer");
  });

  it("includes the family name in the email text", async () => {
    await sendInviteEmail(baseArgs);

    const { text } = resend.emails.send.mock.calls[0][0];
    expect(text).toContain("The Halsey Family");
  });

  it("includes an expiry notice in the email text", async () => {
    await sendInviteEmail(baseArgs);

    const { text } = resend.emails.send.mock.calls[0][0];
    expect(text).toContain("7 days");
  });
});
