import { resend } from "@/lib/resend";

interface SendInviteEmailInput {
  to: string;
  inviterName: string;
  familyName: string;
  acceptUrl: string;
}

export async function sendInviteEmail(input: SendInviteEmailInput): Promise<void> {
  const { to, inviterName, familyName, acceptUrl } = input;

  const text = `Hi,

${inviterName} has invited you to join the ${familyName} family on Family Sync.

Click the link below to accept:
${acceptUrl}

This link expires in 7 days.

If you did not expect this invitation, you can ignore this email.`;

  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not set");
  }

  await resend.emails.send({
    from,
    to,
    subject: `You have been invited to join ${familyName} on Family Sync`,
    text,
  });
}
