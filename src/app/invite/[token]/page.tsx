import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { acceptInviteAction } from "./actions";

interface Props {
  params: Promise<{ token: string }>;
}

// ---------------------------------------------------------------------------
// /invite/[token] — accept invite page (server component)
//
// Four states:
// 1. Not authenticated → redirect to sign-in with callbackUrl back here
// 2. Token invalid, expired, or already accepted → error message
// 3. User already in a different family group → already-in-group error
// 4. Valid token, authenticated, no existing group → confirmation + Accept
// ---------------------------------------------------------------------------

export default async function AcceptInvitePage({ params }: Props) {
  const { token } = await params;
  const session = await auth();

  // State 1: unauthenticated — redirect to sign-in, return here after auth
  if (!session?.user?.id) {
    const callbackUrl = encodeURIComponent(`/invite/${token}`);
    redirect(`/api/auth/signin?callbackUrl=${callbackUrl}`);
  }

  const userId = session.user.id;

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: {
      familyGroup: {
        include: {
          memberships: {
            where: { role: "ORGANIZER" },
            include: { user: { select: { name: true, email: true } } },
          },
        },
      },
    },
  });

  // State 2: token does not exist, already accepted, or expired
  const isInvalid =
    !invite ||
    invite.status === "ACCEPTED" ||
    invite.expiresAt < new Date();

  if (isInvalid) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold text-primary">
          Invite link unavailable
        </h1>
        <p className="text-secondary">
          This invite link is invalid or has expired. Ask the family organizer
          to send a new invite.
        </p>
      </main>
    );
  }

  // State 3: user is already a member of a family group
  const existingMembership = await prisma.groupMembership.findFirst({
    where: { userId },
  });

  if (existingMembership) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold text-primary">
          Already a member
        </h1>
        <p className="mb-6 text-secondary">
          You are already a member of a family group.
        </p>
        <a
          href="/schedule"
          className="font-medium text-amber underline underline-offset-4"
        >
          Go to your schedule
        </a>
      </main>
    );
  }

  // State 4: valid invite — show confirmation with family name and inviter
  const organizer = invite.familyGroup.memberships[0]?.user;
  const inviterName =
    organizer?.name ?? organizer?.email ?? "A family member";
  const familyName = invite.familyGroup.name;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold text-primary md:text-3xl">
        You have been invited
      </h1>

      <p className="mb-8 text-secondary">
        <span className="font-medium text-primary">{inviterName}</span> has
        invited you to join{" "}
        <span className="font-medium text-primary">{familyName}</span> on
        Family Sync.
      </p>

      <form action={acceptInviteAction}>
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          className="rounded-[10px] bg-amber px-6 py-3 font-semibold text-background transition-opacity hover:opacity-90"
        >
          Accept Invitation
        </button>
      </form>
    </main>
  );
}
