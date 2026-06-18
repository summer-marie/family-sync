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

  // State 1: no family group yet — show creation form
  if (!familyGroup) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-primary md:text-3xl">
          Set up your family
        </h1>
        <CreateFamilyForm />
      </main>
    );
  }

  // State 2: has a family group
  const members = await getFamilyGroupMembers({
    userId,
    familyGroupId: familyGroup.id,
  });

  const invites = await prisma.invite.findMany({
    where: { familyGroupId: familyGroup.id },
    orderBy: { createdAt: "asc" },
  });

  const sharedNote = await prisma.sharedNote.findUnique({
    where: { familyGroupId: familyGroup.id },
  });

  const currentMember = members.find((m) => m.userId === userId);
  const isOrganizer = currentMember?.role === "ORGANIZER";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-primary md:text-3xl">
        {familyGroup.name}
      </h1>

      {/* Members section */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-primary">Members</h2>
        <ul
          className="overflow-hidden rounded-[10px]"
          style={{
            backgroundColor: "#1e1b16",
            border: "1px solid rgba(255, 220, 160, 0.10)",
          }}
        >
          {members.map((member, index) => {
            const displayName = member.user.name ?? member.user.email ?? "?";
            const initial = displayName[0].toUpperCase();
            const isOrganiserRow = member.role === "ORGANIZER";

            return (
              <li
                key={member.id}
                className="flex min-h-14 items-center justify-between px-4 py-4 transition-colors hover:bg-row"
                style={
                  index < members.length - 1
                    ? { borderBottom: "1px solid rgba(255, 220, 160, 0.08)" }
                    : undefined
                }
              >
                <div className="flex min-w-0 items-center gap-3">
                  {/* Avatar circle */}
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-amber"
                    style={{ backgroundColor: "#332e27" }}
                  >
                    {initial}
                  </div>

                  <span className="truncate font-medium text-primary">
                    {displayName}
                  </span>

                  {/* Role badge */}
                  {isOrganiserRow ? (
                    <span
                      className="shrink-0 rounded-sm px-2 py-0.5 text-xs font-medium uppercase tracking-wide"
                      style={{
                        backgroundColor: "rgba(212, 168, 83, 0.20)",
                        color: "#d4a853",
                      }}
                    >
                      organizer
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-sm bg-row px-2 py-0.5 text-xs font-medium text-muted">
                      member
                    </span>
                  )}
                </div>

                {isOrganizer && member.userId !== userId && (
                  <RemoveMemberButton
                    familyGroupId={familyGroup.id}
                    memberUserId={member.userId}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Pending invites section */}
      {invites.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-primary">
            Pending Invites
          </h2>
          <ul
            className="overflow-hidden rounded-[10px]"
            style={{
              backgroundColor: "#1e1b16",
              border: "1px solid rgba(255, 220, 160, 0.10)",
            }}
          >
            {invites.map((invite, index) => (
              <li
                key={invite.id}
                className="flex items-center justify-between px-4 py-4"
                style={
                  index < invites.length - 1
                    ? { borderBottom: "1px solid rgba(255, 220, 160, 0.08)" }
                    : undefined
                }
              >
                <span className="min-w-0 truncate text-sm text-secondary">
                  {invite.email}
                </span>
                <span
                  className="ml-3 shrink-0 rounded-sm px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: "#332e27",
                    color: "#d4a853",
                    border: "1px solid rgba(212, 168, 83, 0.20)",
                  }}
                >
                  pending
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Invite form — organizer only */}
      {isOrganizer && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-primary">
            Invite a member
          </h2>
          <InviteForm familyGroupId={familyGroup.id} />
        </section>
      )}

      {/* Shared notes */}
      <section
        className="pt-8"
        style={{ borderTop: "1px solid rgba(255, 220, 160, 0.10)" }}
      >
        <h2 className="mb-3 text-lg font-semibold text-primary">
          Family Notes
        </h2>
        <NotesForm
          familyGroupId={familyGroup.id}
          initialContent={sharedNote?.content ?? ""}
        />
      </section>
    </main>
  );
}
