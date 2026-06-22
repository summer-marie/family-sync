// ---------------------------------------------------------------------------
// /privacy page - static content, no auth required
// ---------------------------------------------------------------------------

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-center text-2xl font-bold text-primary md:text-3xl">
        Privacy
      </h1>

      <div className="space-y-6">
        <section>
          <h2 className="mb-2 text-base font-semibold text-primary">
            What we access
          </h2>
          <p className="text-sm text-secondary">
            When you connect your Google Calendar, Family Sync requests
            read-only access to your calendar through Google OAuth. We never
            request the ability to create, edit, or delete your events.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-primary">
            What we store
          </h2>
          <p className="text-sm text-secondary">
            We store your account information (name, email), your family
            group membership, your calendar connection status, and your
            chosen visibility setting. We do not store your actual calendar
            events — those are read live from Google each time they're
            needed and are never written to our database.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-primary">
            Who can see your information
          </h2>
          <p className="text-sm text-secondary">
            Only members of your family group can see your schedule, and only
            to the extent your visibility setting allows. If your visibility
            is set to "Busy only," other members and the AI assistant see
            busy/free blocks without event titles. You can change this
            setting at any time.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-primary">
            How the AI assistant uses your data
          </h2>
          <p className="text-sm text-secondary">
            The AI schedule assistant only receives schedule data that has
            already been filtered according to each member's visibility
            setting. It cannot see anything you've chosen to hide, and it
            cannot make changes to your calendar — it can only answer
            questions about the schedule data it's given.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-primary">
            Shared notes
          </h2>
          <p className="text-sm text-secondary">
            Notes you add to your family's shared notes are visible to every
            member of that group, along with your name as the author.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-primary">
            Removing access
          </h2>
          <p className="text-sm text-secondary">
            You can revoke Family Sync's access to your Google Calendar at
            any time from your Google Account's security settings.
          </p>
        </section>
      </div>
    </main>
  );
}
