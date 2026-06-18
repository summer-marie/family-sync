import { auth } from "@/auth";
import {
  getMyFamilyGroup,
  getFamilyGroupMembers,
} from "@/features/family/services";
import {
  getConnectionForUser,
  getFamilySchedule,
} from "@/features/calendar/services";
import { updateVisibility } from "@/features/calendar/actions";
import { ChatWidget } from "@/components/chat/chat-widget";
import { ConnectCalendarButton } from "@/components/schedule/connect-calendar-button";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// /schedule page - server component
//
// This page is protected by middleware (redirects unauthenticated users to /).
// It renders three possible states:
// 1. No family group: solo view with connect prompt and a link to /family.
// 2. Has family group, some members connected: full schedule with per-member
//    event lists and unavailable placeholders where connections are missing.
// 3. Has family group, no one connected: all members show as "Not connected".
//
// MVP constraints: pull-on-demand only, no background sync, 7-day window.
// ---------------------------------------------------------------------------

function VisibilityToggle({ isBusyOnly }: { isBusyOnly: boolean }) {
  return (
    <section
      className="mb-6 rounded-[10px] p-4"
      style={{
        backgroundColor: "#1e1b16",
        border: "1px solid rgba(255, 220, 160, 0.10)",
      }}
    >
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Visibility settings
      </h2>
      <form action={updateVisibility}>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="busyOnly"
            defaultChecked={isBusyOnly}
            aria-label="Hide my event titles from family members"
            className="accent-amber"
          />
          <span className="text-sm text-secondary">
            Hide my event titles from family members
          </span>
        </label>
        <button
          type="submit"
          className="mt-3 rounded-lg bg-amber px-4 py-1.5 text-xs font-medium text-canvas hover:bg-amber-hover"
        >
          Save
        </button>
      </form>
      {isBusyOnly && (
        <p className="mt-2 text-xs text-amber">
          Your event titles are hidden from family members.
        </p>
      )}
    </section>
  );
}

export default async function SchedulePage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p>You must be signed in.</p>
      </main>
    );
  }

  const userId = session.user.id;
  const userName = session.user.name ?? session.user.email ?? "You";

  const myConnection = await getConnectionForUser(userId);
  const familyGroup = await getMyFamilyGroup(userId);

  // State 1: no family group
  if (!familyGroup) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-primary md:text-3xl">
          Family Schedule
        </h1>

        {!myConnection && (
          <section
            className="mb-6 rounded-[10px] p-4"
            style={{
              backgroundColor: "#1e1b16",
              border: "1px solid rgba(255, 220, 160, 0.10)",
            }}
          >
            <p className="mb-1 text-sm font-semibold text-amber">
              Connect your calendar
            </p>
            <p className="mb-3 text-sm text-secondary">
              Connect your Google Calendar to share your availability with your
              family.
            </p>
            <ConnectCalendarButton />
          </section>
        )}

        {myConnection && (
          <VisibilityToggle
            isBusyOnly={myConnection.visibility === "BUSY_ONLY"}
          />
        )}

        <section aria-label="Family schedule">
          <p className="mb-4 text-sm text-secondary">
            <a href="/family" className="text-amber underline hover:text-amber-hover">
              Set up your family group
            </a>{" "}
            to see everyone&apos;s schedule together.
          </p>
          <ul aria-label="schedule members" className="space-y-3">
            <li
              className="rounded-[10px] p-4"
              style={{
                backgroundColor: "#1e1b16",
                border: "1px solid rgba(255, 220, 160, 0.10)",
              }}
            >
              <span className="font-semibold text-primary">{userName}</span>{" "}
              <span className="text-sm italic text-muted">Not connected</span>
            </li>
          </ul>
        </section>

        <ChatWidget />
      </main>
    );
  }

  // State 2 / 3: has a family group — pull schedule on demand
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const timeMin = now.toISOString();
  const timeMax = weekLater.toISOString();

  const [members, schedule, sharedNote] = await Promise.all([
    getFamilyGroupMembers({ userId, familyGroupId: familyGroup.id }),
    getFamilySchedule({
      userId,
      familyGroupId: familyGroup.id,
      timeMin,
      timeMax,
    }),
    prisma.sharedNote.findUnique({ where: { familyGroupId: familyGroup.id } }),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-primary md:text-3xl">
        Family Schedule
      </h1>
      <p className="mb-6 text-sm text-secondary">{familyGroup.name}</p>

      {!myConnection && (
        <section
          className="mb-6 rounded-[10px] p-4"
          style={{
            backgroundColor: "#1e1b16",
            border: "1px solid rgba(255, 220, 160, 0.10)",
          }}
        >
          <p className="mb-1 text-sm font-semibold text-amber">
            Connect your calendar
          </p>
          <p className="mb-3 text-sm text-secondary">
            Connect your Google Calendar to share your availability with your
            family.
          </p>
          <ConnectCalendarButton />
        </section>
      )}

      {myConnection && (
        <VisibilityToggle isBusyOnly={myConnection.visibility === "BUSY_ONLY"} />
      )}

      {sharedNote?.content && (
        <section
          className="mb-6 rounded-[10px] p-4"
          style={{
            backgroundColor: "#1e1b16",
            border: "1px solid rgba(255, 220, 160, 0.10)",
          }}
        >
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Schedule Notes
          </h2>
          <p className="whitespace-pre-wrap text-sm text-secondary">
            {sharedNote.content}
          </p>
          <a
            href="/family"
            className="mt-3 inline-block text-xs text-amber hover:text-amber-hover"
          >
            Edit notes
          </a>
        </section>
      )}

      <section aria-label="Family schedule">
        <ul aria-label="schedule members" className="space-y-3">
          {schedule.map((entry) => {
            const member = members.find((m) => m.userId === entry.userId);
            const name =
              member?.user.name ?? member?.user.email ?? entry.userId;

            return (
              <li
                key={entry.userId}
                className="rounded-[10px] p-4"
                style={{
                  backgroundColor: "#1e1b16",
                  border: "1px solid rgba(255, 220, 160, 0.10)",
                }}
              >
                <div className="mb-3 font-semibold text-primary">{name}</div>
                {entry.status === "unavailable" ? (
                  <p className="text-sm italic text-muted">Not connected</p>
                ) : entry.events.length === 0 ? (
                  <p className="text-sm italic text-muted">
                    No events this week
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {entry.events.map((event, i) => (
                      <li
                        key={i}
                        className="rounded-r-md bg-row py-2 pl-3 pr-3 text-sm text-secondary"
                        style={{ borderLeft: "2px solid #d4a853" }}
                      >
                        <span className="font-medium text-primary">
                          {event.title}
                        </span>
                        {" — "}
                        {new Date(event.start).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <ChatWidget familyGroupId={familyGroup.id} />
    </main>
  );
}
