# Neon integration notes for Family Sync Peek

## Decision summary

Neon is the chosen database host for this project because it is a managed serverless Postgres product with documented Prisma integration and connection pooling patterns that fit a Next.js app deployed on Vercel. For this one-week MVP, Neon is being used as the relational database only; auth remains in Auth.js and calendar data comes from Google Calendar.

## Why Neon was chosen

Neon fits this stack well because the app already uses Prisma and is likely to run in a serverless environment, where pooled Postgres connections matter. Neon also keeps the architecture simpler than using a broader backend platform when the project only needs Postgres right now.

## How Neon fits the architecture

The core app stack is:

- Next.js for the web app UI and backend routes.
- Auth.js for user sessions and OAuth sign-in.
- Prisma as the ORM.
- Neon as the Postgres database.
- Google Calendar API for calendar reads.

In this architecture, Neon stores application state and integration state, but not the source-of-truth calendar itself.

## What should be saved in the database

### Core product tables

These tables support accounts, family grouping, privacy, and shared app features:

- `User`: app user profile and identity.
- `FamilyGroup`: one family hub/group.
- `GroupMembership`: membership relation between users and groups.
- `Invite`: pending invite records if invites are implemented.
- `SharedNote`: shared family note content for a group.

### Auth.js tables

If using Auth.js with Prisma, the database should also persist the standard auth models used for sessions and linked accounts.

- `Account`: linked provider account, including Google OAuth account linkage.
- `Session`: active app sessions if using database sessions.
- `VerificationToken`: email/token verification support if needed.

### Google integration tables

These tables support the calendar connection and privacy rules:

- `CalendarConnection`: one row per connected Google account/calendar integration.
- `CalendarSyncState`: optional sync metadata such as last sync time or sync health.
- `CalendarEventCache`: optional cached event/free-busy snapshots for faster reads during demo flows.
- `VisibilitySetting`: whether a member shares only busy/free or also allows titles.

### What should *not* be treated as the primary source of truth

Google Calendar remains the source of truth for real calendar data. The app database should store only the minimum needed to support the user experience: linked account identity, tokens through Auth.js/provider linkage, privacy settings, sync state, and any temporary cached schedule data needed for the shared view or AI answers.

## Recommended MVP data strategy

For the one-week sprint, keep storage minimal:

- Save users, groups, memberships, notes, and calendar connection state.
- Save privacy settings per user or per connection.
- Cache only the minimum schedule data needed for demo speed, if necessary.
- Prefer live reads from Google for simple demo flows unless latency becomes a problem.

A pragmatic MVP cache can be either:

- No cache at first, only live API reads.
- A lightweight short-term cache of free/busy windows and event summaries for the next 7 to 30 days.

## Prisma connection setup notes

Prisma’s Neon guidance focuses on using Neon’s connection handling correctly for serverless environments. The important rule is to separate runtime app traffic from admin-style operations like migrations or seeding, because pooled and direct URLs may be used differently depending on the workflow.

Practical setup notes:

- Use the Neon connection string intended for application runtime in the main `DATABASE_URL` path recommended by Neon/Prisma docs.
- Keep a separate direct connection string for migrations or administrative tasks if the chosen Neon setup requires it.
- Do not hardcode credentials in the repo; keep all DB URLs in environment variables.
- Keep Prisma schema and migrations in version control.

## Integration steps

### 1. Create the Neon project

- Create a Neon project.
- Create a Postgres database for the app.
- Copy the connection details provided by Neon.[1]

### 2. Add environment variables

At minimum, add:

- `DATABASE_URL`
- `DIRECT_URL` if using a separate direct connection for migrations/admin flows.

Store local values in `.env` and production values in Vercel project environment settings.

### 3. Install Prisma and initialize schema

- Install Prisma CLI and Prisma Client.
- Initialize Prisma.
- Set the datasource provider to PostgreSQL.
- Point Prisma to the Neon environment variables.[2]

### 4. Model the MVP schema

Suggested MVP-first entities:

- `User`
- `Account`
- `Session`
- `FamilyGroup`
- `GroupMembership`
- `CalendarConnection`
- `VisibilitySetting`
- `SharedNote`

Optional only if needed this week:

- `Invite`
- `CalendarEventCache`
- `CalendarSyncState`

### 5. Run migration and validate DB access

- Create the initial migration.
- Apply the migration locally.
- Open Prisma Studio or query the DB to confirm tables exist.

### 6. Wire app features to the DB incrementally

Suggested order:

1. Auth.js user persistence.
2. Family group creation.
3. Membership records.
4. Shared note table.
5. Google account linkage / calendar connection metadata.
6. Privacy settings.
7. Optional cache tables.

## MVP schema guidance

Keep the first schema small. For a week sprint, avoid over-modeling recurrence, permission matrices, or complex sync history tables unless the demo truly needs them. The database should mainly answer these questions:

- Who is the user?
- Which family group are they in?
- Which Google account is connected?
- What privacy setting did they choose?
- What shared note belongs to the group?
- What cached availability data, if any, is currently stored?

## Suggested tests while integrating Neon

### Unit tests

- Prisma model validation helpers.
- Group creation service logic.
- Membership authorization helpers.
- Visibility-setting resolver logic.

### Integration tests

- Creating a user and family group persists correctly.
- Adding a member creates the correct membership record.
- Unauthorized group access is rejected.
- Shared note load/save works for authorized members only.
- Calendar connection metadata persists after simulated OAuth success.
- Privacy setting changes persist and are read correctly.

### End-to-end tests

- User signs in and lands in an empty family dashboard.
- User creates a family group.
- User adds or invites a member if invite flow is included.
- User updates shared note content.
- User completes the calendar connect flow stub and sees connected status.

## Common mistakes to avoid

- Treating Google event data as if the app database is the source of truth.
- Building too many cache tables before the demo proves they are needed.
- Mixing app runtime DB access and migration/admin DB access carelessly in env config.gn-in success test.
7. Persist linked account in DB.
8. First Calendar API test call.
9. Show simple “calendar connected” UI state.
10. Add schedule read flow.
11. Add privacy filtering.
12. Add AI prompt/data shaping on top.

## Tests to run during setup

### Manual setup checks

- Sign in with Google locally.
- Confirm callback returns to the app without `redirect_uri_mismatch`.
- Confirm the signed-in user exists in the database.
- Confirm the linked Google provider account exists in the database.
- Confirm the app can make at least one successful Calendar API read for that user.

### Unit tests

- Scope selection helper returns expected scopes.
- Privacy filter removes titles when visibility is hidden.
- Calendar data mapping converts Google responses into the app’s internal format.
- AI context builder excludes restricted fields.

### Integration tests

- Auth callback persists account linkage.
- Unauthorized users cannot access family schedule routes.
- Connection status changes correctly on OAuth success/failure.
- Expired or failed connection state is surfaced clearly.

### End-to-end tests

- User signs in with Google.
- User sees connected calendar state.
- User can open the schedule view.
- User with hidden-title setting does not expose titles in schedule UI.
- AI question flow only uses data the user is allowed to see.

## Common mistakes to avoid

- Assuming Auth.js removes the need for Google Cloud Console setup.
- Registering only one redirect URI and forgetting localhost.
- Trying to test Google OAuth on every Vercel preview deployment during the sprint.
- Requesting broader scopes than the demo actually needs
- Pulling event details into AI context before privacy filtering is applied.
- Treating Google tokens as app-level shared credentials instead of per-user authorized access.

## Demo-week recommendation

For the one-week sprint, optimize for the shortest reliable path:

- Use localhost as the main integration/test environment.
- Use one stable production Vercel URL for demo hosting.
- Keep Google scopes read-only.
- Prefer simple success criteria: connect account, fetch allowed schedule data, apply privacy filter, answer one or two high-value schedule questions.

That path is much more realistic than building a fully generalized sync platform in one week.