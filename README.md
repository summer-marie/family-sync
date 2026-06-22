# Family Sync

A privacy-first family calendar hub with an AI schedule chat. It lets family members connect their Google Calendars, see a shared schedule, and ask natural-language questions about availability — without anyone being forced to expose every detail of their personal calendar or waiting for people to be available to text/call you back to answer.

## The Story

**Problem:** families juggle separate personal Google Calendars. Figuring out who's free means manually cross-referencing multiple calendars, or oversharing by giving everyone full access to every event.

**Who it's for:** families and households who want shared visibility into each other's availability without exposing every event's details to everyone.

**How it helps:** once a few family members connect their calendars, anyone in the group can see combined availability at a glance, ask the AI assistant natural-language questions like "is anyone free Friday afternoon?", and each person individually controls whether their event titles are visible or just shown as busy/free — privacy isn't an afterthought, it's enforced before any data reaches the shared view or the AI.

## Tech Stack

- **Next.js** (App Router) — frontend and backend routes
- **Prisma ORM** with **Neon Postgres** — data layer
- **Auth.js** — authentication via Google OAuth
- **Google Calendar API** — calendar connection and event reads
- **Vercel AI SDK** (`streamText`) — AI schedule chat, streamed responses
- **Vercel** — hosting
- **Vitest** — unit/integration tests
- **Playwright** — end-to-end tests

## Getting Started

1. **Install dependencies**
   ```powershell
   npm install
   ```

2. **Set up environment variables** — copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` / `DIRECT_URL` — your Neon Postgres connection strings (pooled and direct)
   - `AUTH_SECRET` — a generated secret (`npx auth secret`)
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — from a Google Cloud OAuth client
   - `NEXTAUTH_URL` — `http://localhost:3000` for local dev
   - `OPENAI_API_KEY` — for the AI schedule chat
   - `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — for sending invite emails

3. **Apply the database schema**
   ```powershell
   npx prisma migrate dev
   ```

4. **Run the app**
   ```powershell
   npm run dev
   ```
   Visit `http://localhost:3000`.

5. **Run tests**
   ```powershell
   npx vitest run        # unit/integration
   npx playwright test   # end-to-end
   ```

## Testing & TDD Approach

This project follows a test-first workflow, governed by `AGENTS.md` (repo-wide rules), `CLAUDE.md` (Claude-specific extensions), and `docs/tdd-workflow.md` (the process itself). For each feature, the AI coding agent was required to read the relevant spec and these rule files before writing any code, write the test first, run it to confirm a failing (RED) state, then implement only enough to pass (GREEN).

**Vitest** handled unit and integration tests — service-layer logic like authorization checks, privacy filtering, invite/membership rules, and the schedule/notes data layer. These run fast and mock Prisma so they don't require a live database.

**Playwright** handled end-to-end tests — real browser flows covering sign-in, family group creation, invite acceptance, privacy controls reflected in the UI, and the AI chat experience. These exercise the full stack rather than isolated functions.

As the app was refactored throughout development (schema changes, permission changes, behavior changes), existing test files were revisited and updated to match the new intended behavior rather than left stale or quietly skipped — for example, when calendar token refresh logic was added, or when invite permissions changed from organizer-only to any member, the corresponding Vitest suites were updated in the same pass so the test suite stayed an accurate reflection of current behavior.

## Database Schema & Relationships

See [`prisma/SCHEMA.md`](prisma/SCHEMA.md) for the full breakdown of tables, relationships, and the reasoning behind each constraint — including why calendar events are never stored in the database, why invites are decoupled from membership, and why notes are append-only.

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

## How the AI Coding Agent Fits In

Development used an AI coding agent (Claude) operating under explicit, version-controlled rules rather than free rein. `AGENTS.md` defines repo-wide conventions; `CLAUDE.md` extends those with Claude-specific guidance — required reading order, TDD enforcement, "risky areas" (auth, schema, privacy logic) that require explicit confirmation before changes, and protected areas like test integrity. The agent drafted tests and implementations from specs, but schema changes, broad refactors, and anything touching privacy enforcement required the developer's explicit sign-off before proceeding — the rules files are the mechanism for keeping a human in control of an AI-assisted workflow, not just a style guide.

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
