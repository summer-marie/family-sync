import { auth } from "@/auth";
import {
  getMyFamilyGroup,
  getFamilyGroupMembers,
} from "@/features/family/services";
import { prisma } from "@/lib/prisma";
import { CreateFamilyForm } from "@/components/family/create-family-form";
import { InviteForm } from "@/components/family/invite-form";
import { RemoveMemberButton } from "@/components/family/remove-member-button";
import { NotesForm } from "@/components/notes/notes-form";

// ---------------------------------------------------------------------------
// /family page - server component
//
// This page is protected by middleware (redirects unauthenticated users to /).
// It shows one of two states:
// 1. No group: a creation form
// 2. Has group: the group name, invite form, member list, and pending invites
// ---------------------------------------------------------------------------

export default async function FamilyPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p>You must be signed in.</p>
      </main>
    );
  }
  const userId = session.user.id;

  const familyGroup = await getMyFamilyGroup(userId);

  // State 1: no family group yet - show the creation form
  if (!familyGroup) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Set up your family</h1>
        <CreateFamilyForm />
      </main>
    );
  }

  // State 2: has a family group - show the dashboard
  const members = await getFamilyGroupMembers({
    userId,
    familyGroupId: familyGroup.id,
  });

  // Load pending invites for this group
  const invites = await prisma.invite.findMany({
    where: { familyGroupId: familyGroup.id },
    orderBy: { createdAt: "asc" },
  });

  // Load the shared note for this group (null if none created yet)
  const sharedNote = await prisma.sharedNote.findUnique({
    where: { familyGroupId: familyGroup.id },
  });

  // Check if the current user is the organizer
  const currentMember = members.find((m) => m.userId === userId);
  const isOrganizer = currentMember?.role === "ORGANIZER";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">{familyGroup.name}</h1>

      {/* Members section */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Members</h2>
        <ul className="space-y-2">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between rounded border p-2"
            >
              <div>
                <span className="font-medium">
                  {member.user.name ?? member.user.email}
                </span>{" "}
                <span className="text-sm text-gray-500">
                  ({member.role.toLowerCase()})
                </span>
              </div>
              {isOrganizer && member.userId !== userId && (
                <RemoveMemberButton
                  familyGroupId={familyGroup.id}
                  memberUserId={member.userId}
                />
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Pending invites section */}
      {invites.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Pending Invites</h2>
          <ul className="space-y-2">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between rounded border p-2"
              >
                <span>{invite.email}</span>
                <span className="text-sm text-gray-500">pending</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Invite form (organizer only) */}
      {isOrganizer && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Invite a member</h2>
          <InviteForm familyGroupId={familyGroup.id} />
        </section>
      )}

      {/* Shared notes */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Family Notes</h2>
        <NotesForm
          familyGroupId={familyGroup.id}
          initialContent={sharedNote?.content ?? ""}
        />
      </section>
    </main>
  );
}