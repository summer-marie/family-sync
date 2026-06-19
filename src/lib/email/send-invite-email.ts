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

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    to,
    subject: `You have been invited to join ${familyName} on Family Sync`,
    text,
  });
}
