# AGENTS.md

## Project Overview

This repository is **family-sync**, an MVP-scoped, privacy-first family calendar hub with an AI schedule chat.

The product lets family members ask natural-language scheduling questions such as “Is everyone free Sunday afternoon?” without manually checking multiple calendars. It combines connected Google Calendar data into a shared family schedule view, supports shared family notes, and must enforce privacy filtering before any AI prompt context or derived schedule output is created.

This file is the global repo policy layer for coding agents. A repo-local `CLAUDE.md` already exists as an agent-specific extension. Treat this file as the shared baseline policy, and treat `CLAUDE.md` plus any local gitignored agent instructions as compatible extensions unless they clearly conflict with this file.

## Instruction Priority

Agents working in this repo must follow this order of precedence:

1. Direct user instruction for the current task.
2. This `AGENTS.md` file.
3. Repo-local agent files such as `CLAUDE.md`.
4. Tool defaults, personal habits, or generic framework conventions.

If instructions conflict, prefer the more specific instruction closest to the work being performed. Do not ignore this file because another agent file exists.

## Project Scope

### In scope for MVP

- Google Calendar integration only
- Shared family schedule view
- AI schedule chat based on compact, privacy-filtered schedule context
- Shared family notes as a lightweight separate feature
- Explicit family/group membership model
- Pull-on-demand schedule reads from Google Calendar

### Out of scope unless explicitly approved

- Non-Google calendar providers
- AI actions or calendar edits
- Background sync workers, polling jobs, or webhook-driven sync systems
- Full calendar mirrors stored in Neon as the default architecture
- Persistent AI chat memory or DB-backed conversation threads
- Advanced role-based permissions matrixes
- Native mobile apps
- Overengineered abstractions for future scale

When choosing between a simple MVP implementation and a generalized architecture, prefer the simple MVP implementation.

## Stack and Architecture

### Locked stack

Do not suggest or introduce replacements for the following without a concrete blocker and explicit approval:

- Next.js with App Router
- Prisma ORM
- Neon Postgres
- Auth.js
- Google OAuth
- Google Calendar API
- Vercel hosting
- Vercel AI SDK with `streamText`
- Vitest for unit and integration tests
- Playwright for E2E tests
- npm as the package manager

### Expected directories

Assume these directories unless the actual scaffold says otherwise:

- `app/` — Next.js App Router routes
- `src/features/` — feature modules
- `src/components/` — shared UI
- `prisma/` — schema and migrations
- `docs/` — project documentation
- `docs/specs/` — numbered feature specs
- `docs/notes/` — supporting implementation notes

If the real scaffold differs, follow the actual repo layout instead of this provisional structure.

## Core Architectural Rules

### Server/client boundary

The following must remain server-side:

- Privacy filtering
- Prompt construction
- Auth checks
- Authorization checks
- Schedule-data preparation
- Calendar-derived summary generation before data is sent to the client or model

Do not move these concerns into client components.

### AI boundary

The default AI boundary is a standard Next.js App Router Route Handler, such as:

- `app/api/chat/route.ts`

Treat this route handler and its directly related server-side helpers as the primary AI boundary in the repo.

The default server-side flow is:

1. Accept a `POST` request.
2. Authenticate the user.
3. Authorize access to family/group data.
4. Load authorized calendar data.
5. Apply the shared privacy filter.
6. Build compact schedule context.
7. Call Vercel AI SDK `streamText`.
8. Stream the response back to the client.

Do not move the core AI chat flow into a Server Action unless explicitly approved.

### Calendar data strategy

For MVP, assume calendar data is fetched live from the Google Calendar API on request.

Default rules:

- Prefer pull-on-demand reads from Google.
- Treat Google as the source of truth.
- Do not introduce scheduled background sync.
- Do not introduce polling jobs.
- Do not introduce webhook-driven sync architecture.
- Do not design a full calendar mirror in Neon for MVP.

A small cache is allowed only as a limited performance or reliability optimization. Any cache must remain lightweight, scoped, and easy to reason about.

## Data Modeling Rules

### Family model

Model a family as an explicit persisted group-like entity, such as `FamilyGroup`, with membership records such as `GroupMembership`.

Rules:

- Family ownership and access control must come from persisted membership records.
- Do not derive family membership implicitly from invite codes.
- Do not derive family membership from loosely linked accounts.
- Invite codes or email invites may exist as onboarding helpers, but they are not the source of truth for access control.

### Notes model

Treat shared family notes as a separate lightweight feature/module, not part of the AI schedule chat feature.

For MVP:

- Keep notes simple.
- Prefer one shared note space per family group unless the spec says otherwise.
- Do not build a complex collaborative document system by default.

### AI chat state

Treat AI schedule chat as stateless for MVP.

Rules:

- Each user question should be answered from current authorized schedule context.
- Do not add persistent conversation history by default.
- Do not add chat thread tables.
- Do not add memory systems.
- Do not add long-lived conversation storage unless explicitly approved.

### Visibility model

For MVP, visibility controls are binary and applied per connected calendar or calendar connection.

Default expectation:

- Either fuller event details are allowed, or
- Events are reduced to privacy-safe busy/blocked information

Do not implement role-based visibility systems such as adult vs. child access unless explicitly approved.

## Privacy and Security Rules

### Privacy filtering is a first-class constraint

Privacy filtering must live in a dedicated shared server-only module, for example:

- `src/lib/privacy-filter.ts`
- `src/lib/schedule/privacy.ts`

This shared utility is mandatory for any code that builds:

- AI prompt context
- Shared schedule responses
- Schedule summaries
- Availability summaries
- Any other derived output based on calendar data

Any code that exposes, transforms, summarizes, forwards, or serializes calendar data downstream must call the shared privacy filtering utility first.

Do not:

- Keep privacy filtering only inside the schedule-chat feature module
- Rely on middleware alone as the primary enforcement point
- Build prompt context from raw event dumps
- Bypass the shared privacy utility for convenience

Middleware may help at the request boundary, but field-level privacy enforcement must live in the reusable server-side utility.

### Prompt construction rules

AI prompt context must remain compact and based on schedule summaries, not raw calendar dumps.

Rules:

- Never send raw event dumps to the model.
- Build prompt inputs from already-authorized, privacy-filtered data.
- Keep prompt-building helpers server-side.
- Treat prompt construction as a protected area requiring explicit confirmation before major changes.

### Auth.js session contract

Use a custom Auth.js session type as a shared cross-cutting contract.

Rules:

- Keep the session minimal.
- Include stable identity fields such as `userId`.
- Include `familyId` only if the app intentionally depends on it.
- Do not store Google access tokens, refresh tokens, or other provider secrets in the session shape.

Agents must not modify:

- Session type definitions
- Auth callbacks
- Session payload structure

without explicit confirmation.

### Secrets and logging

Non-negotiable rules:

- Never hard-code keys, tokens, or secrets.
- Use environment variables for all secrets.
- Do not log raw calendar payloads.
- Do not log provider tokens.
- Do not log full AI prompt context containing private schedule data.
- Do not log sensitive auth/session data.

For local auth or middleware bypass in development, use only gitignored local environment configuration such as `.env.local`. Do not hard-code `NODE_ENV === "development"` bypasses in shared middleware or shared auth logic.

If implementing a local-only bypass, explain:

- the exact mechanism,
- where it is configured,
- why it is safe,
- and how it remains uncommitted and local-only.

### Error handling defaults

Default error-handling rules:

- Fail closed for auth violations.
- Fail closed for privacy violations.
- For external API failures, degrade gracefully using privacy-safe states such as `unavailable`, `unknown`, or busy summaries.
- Do not expose incomplete or ambiguous private details during partial failures.

## Protected Areas

The following areas are high-risk and require explicit confirmation before non-trivial edits:

- Prisma schema and migrations
- Destructive schema changes of any kind
- Auth.js configuration
- Auth callbacks
- Session logic and session types
- Google OAuth flow
- Google Calendar integration
- AI route handlers and streaming flow
- AI prompt construction
- Privacy filtering logic
- Shared core utilities used by schedule parsing
- Shared core utilities used by auth
- Any server-side code that prepares schedule data for AI or shared outputs

For these areas, do not make broad refactors or “cleanup” edits without explicit approval.

## Database and Prisma Rules

When working with Prisma or SQL:

- Prefer explicit, readable models over clever abstractions.
- Explain schema changes before making them.
- Ask for confirmation before destructive or high-risk migrations.
- Group related migration and seed updates clearly.
- Do not make silent destructive changes.

Destructive changes include, but are not limited to:

- Dropping tables
- Dropping columns
- Renaming columns when data migration is required
- Changing unique constraints that may invalidate existing assumptions
- Changing membership, auth, or privacy-related relations

If seed scripts are added later:

- Make them idempotent.
- Treat them as developer convenience, not a dependency of the core test suite, unless the repo explicitly says otherwise.

## Testing Rules

This repo is TDD-oriented and spec-driven.

### Required behavior

- Write tests before implementation for every feature unless explicitly told otherwise for a narrow task.
- Keep tests co-located with the feature they cover.
- Assume a failing test is correct by default.
- Fix the implementation before weakening the test.
- Do not rewrite, weaken, or delete tests just to make a suite pass.
- Keep commits separated into test creation, implementation, and cleanup stages when practical.

Example test location:

- `src/features/schedule-chat/__tests__/`

### Test strategy defaults

Default testing approach:

- Prefer self-contained Vitest tests.
- Use fixtures, factories, and per-test setup.
- Do not assume a shared seed script is required for automated tests.
- Keep E2E coverage in Playwright focused on real user flows and protected boundaries.

### Test bookkeeping

Maintain a gitignored Markdown log for:

- test-writing prompts
- total tests created

If the repo later defines a canonical file name or location for this log, follow that convention.

## Working Style Rules

For non-trivial work, agents must:

1. Restate the request in 1–3 sentences before acting.
2. Present a short checklist-style plan before making changes.
3. Implement in small, coherent steps.
4. Avoid large multi-file rewrites unless explicitly requested.
5. Summarize what changed, where it changed, what to test, and any follow-up risks after completion.
6. Avoid dumping large patches or full diffs in chat by default.

Ask clarifying questions before making risky or cross-cutting changes, especially for:

- database schemas,
- auth,
- migrations,
- privacy logic,
- AI boundaries,
- shared core utilities.

## Command and Environment Rules

### Package manager and scripts

Use `npm`.

Rules:

- Use canonical commands defined in `package.json` once the project boilerplate exists.
- Do not invent script names.
- Do not assume command aliases that are not present in the repo.
- If scripts are missing, say so explicitly instead of guessing.

### Quality gates

For any non-trivial change, assume the task is not complete until all relevant quality gates pass:

- lint
- type-checking
- relevant tests

Use the exact commands from `package.json` once available.

### Shell environment

The default shell environment is PowerShell.

Rules:

- Do not rely on bash-only syntax.
- Do not use `export FOO=bar`.
- Do not use inline `VAR=value command` syntax.
- Do not assume bash-specific chaining or shell behavior.
- Call out cross-platform differences when they matter.

## Git and Branching Rules

### Branching

Create a new branch for:

- any feature,
- spec-driven task,
- schema change,
- auth/privacy/AI change,
- refactor,
- or other multi-file work.

Use branch prefixes such as:

- `feat/`
- `fix/`
- `refactor/`
- `chore/`

### Merge expectations

A branch should merge back to `main` only when:

- the task is complete,
- relevant tests pass or the gap is explicitly documented,
- the work remains MVP-scoped,
- the branch contains no unrelated changes,
- the implementation matches the intended spec or request.

### Commit messages

Every non-trivial response should include a proposed commit message using a standard prefix such as:

- `feat:`
- `fix:`
- `chore:`
- `refactor:`

Do not bundle unrelated refactors into the same change without calling them out.

## Documentation Boundaries

Keep `AGENTS.md` focused on architecture, repo-level constraints, safety rules, and operating expectations.

Rules:

- Do not turn `AGENTS.md` into a documentation hub.
- Workflow-specific document consultation rules belong in `CLAUDE.md`.
- If docs appear out of sync with implementation or requested work, flag the mismatch and propose updates.
- Do not silently redefine intended behavior just because docs are stale.

## Style and Response Rules for Agents

- No emojis anywhere.
- No emojis in code.
- No emojis in comments.
- No emojis in UI copy.
- No emojis in tests.
- No emojis in docs.
- No emojis in prompts.
- No emojis in responses.

Also:

- Prefer concise, clear explanations.
- Prefer small diffs over sweeping rewrites.
- Be explicit when a rule is being inferred from provisional repo structure rather than actual files.
- Respect the locked stack and MVP scope.

## Default Behavior When Unsure

If the repo scaffold is incomplete or a convention is not yet encoded in the codebase:

- Follow the rules in this file.
- Use conservative MVP defaults.
- Avoid introducing durable architecture for hypothetical future needs.
- Ask before changing protected areas.
- Prefer explicitness over hidden magic.
- Prefer privacy-safe behavior over convenience.