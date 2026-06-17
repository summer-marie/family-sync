import { auth } from "@/auth";
import {
  getMyFamilyGroup,
  getFamilyGroupMembers,
} from "@/features/family/services";
import {
  getConnectionForUser,
  getFamilySchedule,
} from "@/features/calendar/services";
import { ConnectCalendarButton } from "@/components/schedule/connect-calendar-button";

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

export default async function SchedulePage() {
  const session = await auth();

  // Middleware protects this route, but auth() can return null in edge cases.
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

  // State 1: no family group - show solo unavailable view + setup prompt
  if (!familyGroup) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Family Schedule</h1>

        {!myConnection && (
          <section className="mb-6 rounded border border-blue-200 bg-blue-50 p-4">
            <p className="mb-3 text-sm text-blue-800">
              Connect your Google Calendar to share your availability with your
              family.
            </p>
            <ConnectCalendarButton />
          </section>
        )}

        <section aria-label="Family schedule">
          <p className="mb-4 text-sm text-gray-600">
            <a href="/family" className="underline">
              Set up your family group
            </a>{" "}
            to see everyone&apos;s schedule together.
          </p>
          <ul aria-label="schedule members" className="space-y-2">
            <li className="rounded border p-3">
              <span className="font-medium">{userName}</span>{" "}
              <span className="text-sm text-gray-500">Not connected</span>
            </li>
          </ul>
        </section>
      </main>
    );
  }

  // State 2 / 3: has a family group - pull the full schedule on demand
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const timeMin = now.toISOString();
  const timeMax = weekLater.toISOString();

  const [members, schedule] = await Promise.all([
    getFamilyGroupMembers({ userId, familyGroupId: familyGroup.id }),
    getFamilySchedule({
      userId,
      familyGroupId: familyGroup.id,
      timeMin,
      timeMax,
    }),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Family Schedule</h1>
      <p className="mb-6 text-sm text-gray-500">{familyGroup.name}</p>

      {!myConnection && (
        <section className="mb-6 rounded border border-blue-200 bg-blue-50 p-4">
          <p className="mb-3 text-sm text-blue-800">
            Connect your Google Calendar to share your availability with your
            family.
          </p>
          <ConnectCalendarButton />
        </section>
      )}

      <section aria-label="Family schedule">
        <ul aria-label="schedule members" className="space-y-3">
          {schedule.map((entry) => {
            const member = members.find((m) => m.userId === entry.userId);
            const name =
              member?.user.name ?? member?.user.email ?? entry.userId;

            return (
              <li key={entry.userId} className="rounded border p-3">
                <div className="mb-1 font-medium">{name}</div>
                {entry.status === "unavailable" ? (
                  <p className="text-sm text-gray-500">Not connected</p>
                ) : entry.events.length === 0 ? (
                  <p className="text-sm text-gray-500">No events this week</p>
                ) : (
                  <ul className="space-y-1">
                    {entry.events.map((event, i) => (
                      <li key={i} className="text-sm">
                        <span className="font-medium">{event.title}</span>
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
    </main>
  );
}
