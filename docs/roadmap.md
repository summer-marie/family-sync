# Family Sync Roadmap

This is the single canonical roadmap for the MVP. It is intentionally the one
document to open when deciding what to work on next, what is in scope, and what
to say no to. Update the status tables and notes inline as problems arise.

Anything not listed here is out of scope unless you explicitly add it.

## How to use this roadmap

- Use the **Status Tracker** tables at the bottom to mark progress per step.
- Use the **Explicitly Out of Scope** list as the anti-scope-creep guardrail.
- Use the **Dependency-Ordered Roadmap** to know what blocks what.
- Use the **Per-Module Test Inventory** to know what tests each step needs.
- When a step requires schema, auth, privacy, or AI changes, check the
  **Protected Areas Checklist** before starting.

---

## MVP Scope (from AGENTS.md and CLAUDE.md)

In scope:
- User auth (Auth.js + Google OAuth)
- Family group creation and membership
- Google Calendar connection (pull-on-demand reads only)
- Shared family schedule view
- Privacy and visibility controls for event detail exposure
- AI schedule chat (read-only, stateless, streaming)
- Shared family notes (one shared note space per family group)

Locked stack (do not replace without explicit approval):
- Next.js (App Router)
- Prisma ORMhe
- Neon Postgres
- Auth.js
- Google OAuth
- Google Calendar API
- Vercel hosting
- Vercel AI SDK with `streamText`
- Vitest (unit and integration)
- Playwright (E2E)

---

## Explicitly Out of Scope (anti-scope-creep list)

If any of these appear in a task or PR, stop and confirm before proceeding:
- Non-Google calendar providers
- AI actions, calendar edits, or agentic tool-calling loops
- Background sync workers, polling jobs, or webhook-driven sync
- A full calendar mirror stored in Neon as the default architecture
- Persistent AI chat memory, DB-backed conversation threads, or memory systems
- Advanced role-based permission matrices (adult vs. child, custom roles)
- Native mobile apps (MVP is responsive web)
- Overengineered abstractions for hypothetical future scale
- Collaborative note features such as edit history, comments, or rich documents
- Multi-step AI agents or long prompts
- Calendar write actions

---

## Current State Assessment (as of this commit)

Scaffolded:
- Next.js app with App Router, Tailwind, basic layout and home page
- `prisma/schema.prisma` with Auth.js base models only:
  `User`, `Account`, `Session`, `VerificationToken`
- `src/auth.ts` configured: Google provider, `calendar.readonly` scope,
  `access_type: 'offline'`, `prompt: 'consent'`, session callback adds `user.id`
- `src/lib/prisma.ts` Prisma client helper
- `src/lib/google/calendar.ts` and `src/lib/google/get-access-token.ts`
  Google Calendar client helpers
- Vitest configured with jsdom and `@testing-library/jest-dom` setup
- Playwright configured with `global-setup.ts`, authenticated fixtures, and
  failure screenshots plus retain-on-failure traces
- TDD tracking convention in place: `docs/tdd/logs/` with gitignored logs

Missing:
- No feature models in Prisma schema:
  no `FamilyGroup`, `GroupMembership`, `CalendarConnection`, `SharedNote`,
  no visibility fields
- `src/app/api/` is empty (no chat route)
- No schedule library (`src/lib/schedule/*`)
- No privacy filter module
- No feature tests exist yet (both Vitest and Playwright suites are empty)
- No feature pages or components

---

## TDD Workflow Recap

Per-module RED/GREEN/REFACTOR loop:
1. Write the failing test first.
2. Run the suite with output redirected to a numbered RED log.
3. Confirm the test fails for the RIGHT reason (behavior absent), not a typo,
   bad import, or path error.
4. Implement the minimum code to pass.
5. Re-run and capture GREEN output if desired.
6. Refactor only after GREEN.

Vitest RED capture (PowerShell):
```powershell
npx vitest run src/features/schedule-chat 2>&1 | Tee-Object -FilePath docs/tdd/logs/01-schedule-chat-red.txt
```
- `2>&1` is mandatory; Vitest prints failures to stderr.
- `Tee-Object` writes to file and terminal simultaneously.

Vitest RED capture (cmd.exe):
```cmd
npx vitest run src/features/schedule-chat > docs/tdd/logs/01-schedule-chat-red.txt 2>&1
```

Playwright RED capture (PowerShell):
```powershell
npx playwright test e2e/schedule-chat.spec.ts 2>&1 | Tee-Object -FilePath docs/tdd/logs/01-schedule-chat-e2e-red.txt
```

Playwright HTML report (visual progress dashboard, no commit required):
```powershell
npx playwright test
npx playwright show-report
```

Screenshots policy:
- Vitest runs in jsdom and cannot produce meaningful screenshots.
- Playwright auto-captures a screenshot on E2E failure (`screenshot: 'only-on-failure'`)
  and keeps a trace (`trace: 'retain-on-failure'`).
- For explicit captures inside a test, call
  `await page.screenshot({ path: '...', fullPage: true })`.

---

## Config Gap to Fix First

`tsconfig.json` defines the path alias `@/*` -> `./src/*`, but
`vitest.config.ts` does **not** define it. Any test importing `@/lib/...` or
`@/features/...` will fail to resolve, which would make RED logs show import
errors instead of real assertion failures.

Fix: add the resolve alias to `vitest.config.ts` before writing the first test
that uses `@/`. This is low-risk and not a protected area.

---

## Dependency-Ordered Roadmap

Each step lists: what it is, depends on, affected files, required tests, and
whether it touches a protected area.

### Step 0: Config fix

- What: teach Vitest the `@/*` -> `./src/*` alias.
- Depends on: nothing.
- Files: `vitest.config.ts`.
- Tests: none (verification only - run any test and confirm `@/` resolves).
- Protected: no.
- Done criteria: a test importing `@/lib/...` runs without resolution errors.

### Step 1: Schedule library (pure logic, no blockers)

- What: three pure server-only helpers used by the AI chat and schedule view.
  - `src/lib/schedule/normalize.ts` - raw calendar events to compact summary.
  - `src/lib/schedule/privacy.ts` - mandatory shared privacy filter that strips
    hidden titles. First-class protected concern per AGENTS.md.
  - `src/lib/schedule/question-parser.ts` - classifies a natural-language
    question into a supported type or out-of-scope.
- Depends on: Step 0.
- Files: `src/lib/schedule/*.ts`, `src/lib/schedule/__tests__/*.test.ts`.
- Tests (unit):
  - normalization returns expected compact format from event fixtures.
  - privacy filter removes hidden titles, keeps busy/blocked info.
  - privacy filter never leaks titles when visibility is hidden.
  - question parser classifies supported types (free-at-time, who-is-busy,
    free-window, summarize-conflicts-day).
  - question parser returns out-of-scope for unsupported questions.
- Protected: `privacy.ts` is sensitive. Writing tests first is safe; review the
  implementation carefully because this module is mandatory for any schedule
  output and AI prompt context.
- Done criteria: all unit tests green; privacy filter is a standalone
  server-only module imported by any code that builds schedule-derived output.

### Step 2: Auth and Family Access (spec 003)

- What: family group creation, membership, group views, protected routes,
  membership visibility.
- Depends on: Step 0.
- Files: `prisma/schema.prisma`, migration, `src/features/family/*`,
  family routes under `src/app/`, `src/auth.ts` session (if familyId needed).
- Tests:
  - Integration: authenticated user can create a family group; unauthorized
    users rejected; membership updates after add/remove; cross-group access
    denied.
  - E2E: sign-in, protected route redirect, family group creation, member list
    visibility.
- Protected: YES - Prisma schema and migrations, Auth.js, session shape.
- Done criteria: a user can be in exactly one family group (MVP), membership is
  persisted, unauthorized access fails closed.

### Step 3: Calendar Connection (spec 002)

- What: store a Google Calendar connection per user, pull events on demand,
  surface connection failures cleanly.
- Depends on: Step 2 (need family context).
- Files: `prisma/schema.prisma` (add `CalendarConnection`), migration,
  `src/lib/google/*` (extend helpers), connection UI and routes.
- Tests:
  - Integration: connection is persisted, reconnect flow handled, missing or
    expired connection returns a privacy-safe `unavailable` state, pull-on-demand
    reads return expected window of events.
  - E2E: connect flow, schedule view renders with at least one connected
    calendar, schedule view degrades when a member has no connection.
- Protected: YES - Prisma schema, Google OAuth and Calendar integration.
- Constraints: pull-on-demand only. No background sync, no webhooks, no Neon
  mirror as default.

### Step 4: Privacy and Visibility Controls (spec 004)

- What: binary visibility per calendar connection (full details vs.
  busy/blocked only), reflected in the schedule view and AI responses.
- Depends on: Step 3 (visibility lives on `CalendarConnection`), Step 1
  (privacy filter does the work).
- Files: `prisma/schema.prisma` (visibility field), migration, settings UI,
  wire visibility into schedule view and AI prompt path.
- Tests:
  - Integration: hidden titles stay hidden in schedule view output and in any
    AI prompt context; changing visibility takes effect on next read.
  - E2E: hidden-title member's events show as Busy in the shared schedule and
    in AI answers.
- Protected: YES - privacy filtering logic is a first-class protected area.

### Step 5: AI Schedule Chat (spec 001) - top priority feature

- What: `app/api/chat/route.ts` Route Handler with `streamText`. Authenticate,
  authorize family access, load authorized schedule data, apply privacy filter,
  build compact prompt, stream response.
- Depends on: Steps 1-4 all green.
- Files: `src/app/api/chat/route.ts`, `src/lib/ai.ts` (prompt builder),
  chat UI components, `e2e/schedule-chat.spec.ts`.
- Tests:
  - Unit: prompt builder includes only allowed data, out-of-scope fallback
    logic works (covered alongside Step 1).
  - Integration: authenticated user can call the route; unauthorized rejected;
    route loads only the correct family group's data; hidden titles respected
    before prompt creation; empty/incomplete schedule returns safe response;
    route returns a streaming response.
  - E2E: user submits a supported question, response streams, correct answer
    for a known fixture, restricted visibility hides titles, clean error state.
- Protected: YES - AI route handler, streaming flow, prompt construction.
- Constraints: stateless (no chat memory), compact prompt, no AI actions.

### Step 6: Shared Family Notes (spec 005)

- What: one shared note space per family group, create and edit by members,
  unauthorized access denied.
- Depends on: Step 2 (family membership).
- Files: `prisma/schema.prisma` (add `SharedNote`), migration, notes UI and
  routes.
- Tests:
  - Integration: members can create and edit the shared note; non-members
    denied; empty content handled.
  - E2E: authorized member views and updates the note; unauthorized user
    cannot reach it.
- Protected: Prisma schema (migration only; notes are not a sensitive area).

---

## Schema Proposal Placeholders (NEED EXPLICIT CONFIRMATION)

These are proposed shapes for review. Do not migrate until you sign off. All
are protected-area changes.

`FamilyGroup` (Step 2):
- `id` String (cuid)
- `name` String
- `createdAt`, `updatedAt`
- relations: memberships, optional shared note, optional calendar connections
  through members

`GroupMembership` (Step 2):
- `id` String (cuid)
- `familyGroupId` String
- `userId` String
- `role` Enum (MVP: ORGANIZER, MEMBER - no advanced matrix)
- `createdAt`
- unique constraint on `[familyGroupId, userId]` so membership is explicit and
  not derivable from invites

Invite codes (optional helper, not source of truth):
- if used, an `Invite` model tied to `familyGroupId` with an expiry; membership
  is still created only when a user accepts.

`CalendarConnection` (Step 3 + Step 4):
- `id` String (cuid)
- `userId` String
- `provider` String (MVP: always "google")
- `status` Enum (CONNECTED, DISCONNECTED, ERROR)
- `visibility` Enum (FULL, BUSY_ONLY) - binary per AGENTS.md
- `lastConnectedAt` DateTime
- optional cached fields only if a lightweight cache is explicitly approved

`SharedNote` (Step 6):
- `id` String (cuid)
- `familyGroupId` String (unique - one note per family for MVP)
- `content` String (default empty)
- `updatedAt`, `updatedByUserId`

Visibility model reminder: binary per connection. No adult/child roles, no
per-event overrides, no field-level matrices unless explicitly approved.

---

## Per-Module Test Inventory

### Step 1 - Schedule library (Vitest unit)
- `normalize.ts`: compact summary from event fixtures, timezone handling,
  empty input.
- `privacy.ts`: hidden title removed, busy/blocked retained, mixed visibility
  across members, never leaks title text when hidden.
- `question-parser.ts`: supported types classified, out-of-scope returned,
  ambiguous date references handled safely.

### Step 2 - Auth and Family Access
- Vitest integration: create group, add/remove member, cross-group denial,
  duplicate invite handling, invalid email handling.
- Playwright E2E: sign-in, protected route redirect, group creation, member
  list view.

### Step 3 - Calendar Connection
- Vitest integration: persisted connection, reconnect, expired/disconnected
  returns privacy-safe `unavailable`, pull-on-demand window correctness.
- Playwright E2E: connect flow, shared schedule renders, degrades when a member
  has no connection.

### Step 4 - Privacy Controls
- Vitest integration: hidden title stays hidden in schedule output and AI
  prompt context; visibility change effective on next read.
- Playwright E2E: hidden member shows as Busy in schedule and AI answers.

### Step 5 - AI Schedule Chat
- Vitest unit: prompt builder includes only allowed data, out-of-scope fallback.
- Vitest integration: auth required, family-group authorization, hidden titles
  respected pre-prompt, empty schedule safe response, streaming response shape.
- Playwright E2E: submit supported question, streaming appears, correct answer
  for fixture, restricted visibility hides titles, clean error state.

### Step 6 - Shared Notes
- Vitest integration: member create/edit, non-member denial, empty content.
- Playwright E2E: authorized view/update, unauthorized blocked.

---

## Protected Areas Checklist

Before editing any of these, summarize current behavior, propose the change,
and confirm before proceeding:
- Prisma schema and migrations
- Destructive schema changes (drops, renames with data migration)
- Auth.js configuration and callbacks
- Session logic and session types
- Google OAuth flow
- Google Calendar integration
- AI route handlers and streaming flow
- AI prompt construction
- Privacy filtering logic
- Shared core utilities used by schedule parsing or auth

---

## Branching and Commit Conventions

When to create a branch (anything beyond a tiny typo or isolated doc fix):
- new feature
- spec-driven task
- schema, auth, privacy, AI, or calendar change
- refactor
- multi-file work
- experiment you may discard

Branch prefixes: `feat/`, `fix/`, `refactor/`, `chore/`.
Suggested names:
- `feat/schedule-logic`
- `feat/auth-family-access`
- `feat/calendar-connection`
- `feat/privacy-controls`
- `feat/ai-schedule-chat`
- `feat/shared-notes`
- `chore/vitest-alias-config`

Commit prefixes: `feat:`, `fix:`, `chore:`, `refactor:`.
Keep commits separated into test creation, implementation, and cleanup stages
when practical.

Merge to main only when:
1. The scoped task is complete.
2. Relevant tests pass or the gap is clearly documented.
3. The change stays within MVP scope.
4. The branch has no unrelated changes.
5. The implementation matches the spec and TDD workflow.

Commits are user-owned. No tooling in this repo creates commits for you.

---

## Open Decisions Needed

These need your call before the relevant step can proceed:
- Schema direction: approve the proposed models above, or adjust before any
  migration.
- Visibility default for new connections: FULL or BUSY_ONLY.
- Invite mechanism: email link, pending invite state, or manual join code.
  (Membership is always persisted; invites are only an onboarding helper.)
- LLM choice for AI chat (the MVP notes leave this open).
- Whether the session should carry `familyId` (only if the app depends on it).

---

## Status Tracker

Update these as you go. Add a short note when something blocks a step.

### Step 0 - Config fix
- [x] Add `@/*` alias to `vitest.config.ts`
- [x] Verify a `@/lib/...` import resolves in a test run

### Step 1 - Schedule library
- [x] Write failing tests for `normalize.ts`
- [x] Capture `01-normalize-red.txt`
- [x] Implement `normalize.ts` to green
- [x] Write failing tests for `privacy.ts`
- [x] Capture `02-privacy-red.txt`
- [x] Implement `privacy.ts` to green
- [x] Write failing tests for `question-parser.ts`
- [x] Capture `03-question-parser-red.txt`
- [x] Implement `question-parser.ts` to green

### Step 2 - Auth and Family Access (spec 003)
- [x] Confirm schema proposal
- [x] Migration applied
- [x] Write failing integration tests
- [x] Capture `04-auth-family-red.txt`
- [x] Implement to green
- [x] Write failing E2E tests
- [x] Capture `04-auth-family-e2e-red.txt`
- [x] Implement to green

### Step 3 - Calendar Connection (spec 002)
- [x] Confirm schema proposal
- [x] Migration applied
- [x] Write failing integration tests
- [x] Capture `05-calendar-connection-red.txt`
- [x] Implement to green
- [x] Write failing E2E tests
- [x] Capture `05-calendar-connection-e2e-red.txt`
- [x] Implement to green

### Step 4 - Privacy Controls (spec 004)
- [x] Confirm visibility field on `CalendarConnection`
- [x] Migration applied (20260617161944_add_visibility_to_calendar_connection)
- [x] Write failing integration tests
- [x] Capture `11-privacy-controls-red.txt`
- [x] Implement to green (services.ts applies applyPrivacyFilter per member)
- [x] Write failing E2E tests (2 RED placeholders in e2e/privacy-controls.spec.ts)
- [ ] Capture E2E green — blocked: visibility settings UI and E2E seeding not yet built
- [ ] Implement E2E to green — requires: visibility toggle UI + server action + global-setup seeding

### Step 5 - AI Schedule Chat (spec 001)
- [ ] Write failing integration tests for `app/api/chat/route.ts`
- [ ] Capture `07-ai-chat-red.txt`
- [ ] Implement route handler and prompt builder to green
- [ ] Write failing E2E tests
- [ ] Capture `07-ai-chat-e2e-red.txt`
- [ ] Implement chat UI to green

### Step 6 - Shared Notes (spec 005)
- [ ] Confirm `SharedNote` model
- [ ] Migration applied
- [ ] Write failing integration tests
- [ ] Capture `08-shared-notes-red.txt`
- [ ] Implement to green
- [ ] Write failing E2E tests
- [ ] Capture `08-shared-notes-e2e-red.txt`
- [ ] Implement to green

### Issues and notes
- (Add blocker notes here as they come up.)