import { auth } from "@/auth";
import { getMyFamilyGroup } from "@/features/family/services";
import { listNotes } from "@/features/notes/services";
import { NotesForm } from "@/components/notes/notes-form";

// ---------------------------------------------------------------------------
// /notes page - server component
//
// This page is protected by middleware (redirects unauthenticated users to /).
// Shows every shared note for the family group as a card (newest first),
// visible to all members, plus a blank form for adding a new one.
// ---------------------------------------------------------------------------

export default async function NotesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p>You must be signed in.</p>
      </main>
    );
  }

  const familyGroup = await getMyFamilyGroup(session.user.id);

  if (!familyGroup) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-primary md:text-3xl">
          Family Notes
        </h1>
        <p className="text-sm text-secondary">
          <a href="/family" className="text-amber underline hover:text-amber-hover">
            Set up your family group
          </a>{" "}
          to start sharing notes.
        </p>
      </main>
    );
  }

  const notes = await listNotes({
    userId: session.user.id,
    familyGroupId: familyGroup.id,
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-primary md:text-3xl">
        Family Notes
      </h1>
      <p className="mb-6 text-sm text-secondary">{familyGroup.name}</p>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Notes
        </h2>
        {notes.length === 0 ? (
          <p className="text-sm italic text-muted">No notes yet.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => {
              const authorName = note.updatedBy.name ?? note.updatedBy.email ?? "Unknown";
              return (
                <li
                  key={note.id}
                  className="rounded-[0.625rem] p-4"
                  style={{
                    backgroundColor: "#1e1b16",
                    border: "1px solid rgba(255, 220, 160, 0.10)",
                  }}
                >
                  <p className="mb-2 whitespace-pre-wrap text-sm text-secondary">
                    {note.content}
                  </p>
                  <p className="text-xs text-muted">
                    {authorName} — {note.createdAt.toLocaleString()}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Add a note
        </h2>
        <NotesForm familyGroupId={familyGroup.id} />
      </section>
    </main>
  );
}
