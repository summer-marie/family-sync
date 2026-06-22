## Testing & TDD Approach

This project follows a test-first workflow, governed by `AGENTS.md` (repo-wide rules), `CLAUDE.md` (Claude-specific extensions), and `docs/tdd-workflow.md` (the process itself). For each feature, the AI coding agent was required to read the relevant spec and these rule files before writing any code, write the test first, run it to confirm a failing (RED) state, then implement only enough to pass (GREEN).

**Vitest** handled unit and integration tests — service-layer logic like authorization checks, privacy filtering, invite/membership rules, and the schedule/notes data layer. These run fast and mock Prisma so they don't require a live database.

**Playwright** handled end-to-end tests — real browser flows covering sign-in, family group creation, invite acceptance, privacy controls reflected in the UI, and the AI chat experience. These exercise the full stack rather than isolated functions.

As the app was refactored throughout development (schema changes, permission changes, behavior changes), existing test files were revisited and updated to match the new intended behavior rather than left stale or quietly skipped — for example, when calendar token refresh logic was added, or when invite permissions changed from organizer-only to any member, the corresponding Vitest suites were updated in the same pass so the test suite stayed an accurate reflection of current behavior.

## Database Schema & Relationships

- **User / Account / Session** — standard Auth.js identity tables. `Account` stores the Google OAuth tokens (including the refresh token used to silently renew expired access tokens).
- **FamilyGroup ↔ GroupMembership ↔ User** — `GroupMembership` is the join table connecting users to family groups, carrying a `role` (ORGANIZER or MEMBER). For MVP, a unique constraint limits each user to one family group.
- **Invite** — belongs to a `FamilyGroup`, independent of `GroupMembership`. An invite is onboarding evidence, not an access boundary — actual access is only ever granted once an invite is accepted and a `GroupMembership` row is created.
- **CalendarConnection** — one per user per provider (Google only for MVP), holding connection status and a privacy `visibility` setting (FULL or BUSY_ONLY). Actual calendar events are never stored here or anywhere in the database — they're fetched live from Google on request; this table only tracks the connection and permission state.
- **SharedNote** — many notes per `FamilyGroup`, each attributed to the `User` who wrote it, displayed as cards to all members.

## Project Structure

```text
src/
├── app/          Next.js App Router pages and API routes (schedule, family, notes, invite, auth)
├── components/   Client-facing UI components, grouped by feature area
├── features/     Server-side service layer (business logic, authorization, data access)
├── lib/          Shared utilities (Prisma client, Google API, email, schedule/privacy helpers)
├── generated/    Auto-generated Prisma client (not hand-edited)
└── test/         Shared test factories and stubs
```

## MVP Scope & Future Direction

This is a one-week MVP focused on proving the core idea — AI-assisted family schedule coordination with privacy built in — rather than building toward long-term scale.

**In scope for the MVP:** Google-only calendar integration, one family group per user, binary privacy visibility (full detail vs. busy-only), AI schedule chat answering natural-language questions, and shared family notes.

**Explicitly out of scope for now, considered for a future version:**
- Support for non-Google calendar providers
- AI-assisted actions (e.g. the assistant creating or editing calendar events, not just answering questions about them)
- More granular permission levels beyond organizer/member
- Multiple family groups per user
- A smoother reconnection/recovery flow for expired or revoked calendar connections
- Group management enhancements (renaming, more graceful member removal, deletion confirmation flows)
- Expanded mobile support beyond responsive web (e.g. a PWA or native build)
