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

type TimedEvent = { start: string; end: string; isAllDay: boolean };

// Renders "All day" or an event's start–end time range (date shown separately
// as the day-group heading, so it's omitted here).
function formatEventTimeRange(event: TimedEvent): string {
  if (event.isAllDay) {
    return "All day";
  }

  const startTime = new Date(event.start).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = new Date(event.end).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${startTime} – ${endTime}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Buckets events into one entry per calendar day for the next `days` days
// starting from `startDate`, so every day shows up — even ones with nothing
// scheduled — rather than only days that have events.
function groupEventsByDay<T extends TimedEvent>(
  events: T[],
  startDate: Date,
  days = 7,
): { date: Date; events: T[] }[] {
  const buckets = Array.from({ length: days }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return { date, events: [] as T[] };
  });

  for (const event of events) {
    const eventDate = new Date(event.start);
    const bucket = buckets.find((b) => isSameDay(b.date, eventDate));
    if (bucket) bucket.events.push(event);
  }

  for (const bucket of buckets) {
    bucket.events.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );
  }

  return buckets;
}

function VisibilityToggle({ isBusyOnly }: { isBusyOnly: boolean }) {
  return (
    <section
      className="mb-6 rounded-[0.625rem] p-4"
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

  // Error state: the viewing user's own connection is in ERROR (e.g. an
  // expired Google token). Render a user-facing notice with a reconnect CTA
  // before anything else. The rest of the schedule still renders so the user
  // can see other members' availability — we degrade gracefully rather than
  // crashing or hiding the whole page (AGENTS.md).
  const hasConnectionError = myConnection?.status === "ERROR";

  // State 1: no family group
  if (!familyGroup) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-primary md:text-3xl">
          Family Schedule
        </h1>

        {hasConnectionError && (
          <section
            className="mb-6 rounded-[0.625rem] p-4"
            style={{
              backgroundColor: "#1e1b16",
              border: "1px solid rgba(255, 220, 160, 0.10)",
            }}
          >
            <p className="mb-1 text-sm font-semibold text-amber">
              Your Google Calendar connection expired
            </p>
            <p className="mb-3 text-sm text-secondary">
              We could not read your calendar. Reconnect to share your
              availability with your family.
            </p>
            <ConnectCalendarButton />
          </section>
        )}

        {!myConnection && (
          <section
            className="mb-6 rounded-[0.625rem] p-4"
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
              className="rounded-[0.625rem] p-4"
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

  const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const aiTimeMax = ninetyDays.toISOString();

  const [members, schedule, aiSchedule] = await Promise.all([
    getFamilyGroupMembers({ userId, familyGroupId: familyGroup.id }),
    getFamilySchedule({
      userId,
      familyGroupId: familyGroup.id,
      timeMin,
      timeMax,
    }),
    // 90-day window for the AI chat — separate from the 7-day UI view.
    getFamilySchedule({
      userId,
      familyGroupId: familyGroup.id,
      timeMin,
      timeMax: aiTimeMax,
    }),
  ]);

  return (
    <main className="mx-auto px-4 py-8 lg:max-w-6xl">
      <div className="flex flex-col lg:flex-row lg:items-end lg:gap-6">
        <div className="lg:w-[28.75rem] lg:shrink-0">
          <h1 className="mb-1 text-2xl font-bold text-primary md:text-3xl">
            Family Schedule
          </h1>
          <p className="mb-6 text-sm text-secondary">{familyGroup.name}</p>
        </div>
        <h2 className="hidden text-center text-base font-semibold text-primary lg:mb-6 lg:block lg:flex-1">
          A 7-day view of everyone&apos;s availability
        </h2>
      </div>

      {hasConnectionError && (
        <section
          className="mb-6 rounded-[0.625rem] p-4"
          style={{
            backgroundColor: "#1e1b16",
            border: "1px solid rgba(255, 220, 160, 0.10)",
          }}
        >
          <p className="mb-1 text-sm font-semibold text-amber">
            Your Google Calendar connection expired
          </p>
          <p className="mb-3 text-sm text-secondary">
            We could not read your calendar. Reconnect to share your
            availability with your family.
          </p>
          <ConnectCalendarButton />
        </section>
      )}

      {!myConnection && (
        <section
          className="mb-6 rounded-[0.625rem] p-4"
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

      {/* Desktop: two-column layout — left column (settings + chat) and a
          right column whose schedule panel scrolls independently so a long
          family schedule never pushes the chat out of view. Mobile keeps the
          original single stacked column (unchanged below lg). */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-col gap-3 lg:w-[28.75rem] lg:shrink-0">
          {myConnection && (
            <VisibilityToggle
              isBusyOnly={myConnection.visibility === "BUSY_ONLY"}
            />
          )}

          <h2 className="text-center text-base font-semibold text-primary">
            Ask the AI assistant about any family member&apos;s schedule — it
            can answer questions up to 90 days from now.
          </h2>

          <ChatWidget
            familyGroupId={familyGroup.id}
            familyName={familyGroup.name}
            schedule={aiSchedule}
          />
        </div>

        <section
          aria-label="Family schedule"
          className="min-w-0 flex-1 lg:sticky lg:top-8 lg:flex lg:max-h-[calc(100vh-4rem)] lg:flex-col"
        >
          <h2 className="mb-3 text-center text-base font-semibold text-primary lg:hidden">
            A 7-day view of everyone&apos;s availability
          </h2>

          <ul
            aria-label="schedule members"
            className="schedule-scroll space-y-3 lg:flex-1 lg:overflow-y-auto"
          >
            {schedule.map((entry) => {
              const member = members.find((m) => m.userId === entry.userId);
              const name =
                member?.user.name ?? member?.user.email ?? entry.userId;

              return (
                <li
                  key={entry.userId}
                  className="rounded-[0.625rem] p-4"
                  style={{
                    backgroundColor: "#1e1b16",
                    border: "1px solid rgba(255, 220, 160, 0.10)",
                  }}
                >
                  <div className="mb-3 font-semibold text-primary">{name}</div>
                  {entry.status === "unavailable" ? (
                    <p className="text-sm italic text-muted">Not connected</p>
                  ) : (
                    <ul className="space-y-3">
                      {groupEventsByDay(entry.events, now).map((day) => (
                        <li key={day.date.toDateString()}>
                          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                            {day.date.toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "numeric",
                              day: "numeric",
                            })}
                          </div>
                          {day.events.length === 0 ? (
                            <p className="text-sm italic text-muted">Free</p>
                          ) : (
                            <ul className="space-y-2">
                              {day.events.map((event, i) => (
                                <li
                                  key={i}
                                  className="rounded-r-md bg-row py-2 pl-3 pr-3 text-sm text-secondary"
                                  style={{ borderLeft: "2px solid #d4a853" }}
                                >
                                  <span className="font-medium text-primary">
                                    {event.title}
                                  </span>
                                  {" — "}
                                  {formatEventTimeRange(event)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
