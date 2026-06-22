# CLAUDE.md

## Purpose

This file defines Claude-specific behavior for the `family-sync` repository. Claude must read and obey `AGENTS.md` first, then use this file as a repo-specific extension for implementation, refactors, testing, and documentation work in this codebase.

Do not duplicate or override repo-wide rules from `AGENTS.md` unless this file adds tighter Claude-specific guidance.

## Project Context

`family-sync` is a privacy-first family calendar hub with an AI schedule chat. The main product goal is to let family members ask natural-language scheduling questions, such as whether everyone is free at a given time, without manually checking multiple calendars.

This repo is currently focused on a tight MVP. Keep implementation decisions aligned with shipping a simple, reliable one-week MVP rather than designing for hypothetical long-term scale.

## Product Priorities

Prioritize work in this order:

1. AI schedule chat as the core differentiator.
2. Privacy filtering and visibility controls.
3. Google Calendar connection and reliable schedule ingestion.
4. Shared family schedule experience.
5. Shared family notes and supporting family-group workflows.

When tradeoffs appear, favor simplicity, privacy, and fast MVP delivery over extensibility or abstraction-heavy designs.

## MVP Scope

In scope for this MVP:

- User auth
- Family group creation and membership
- Google Calendar connection
- Shared family schedule view
- Privacy and visibility controls for event detail exposure
- AI schedule chat
- Shared family notes

Out of scope for this MVP unless explicitly requested:

- Non-Google calendar providers
- AI actions or calendar edits
- Advanced permission matrixes
- Heavy background sync architecture
- Native mobile apps
- Overengineered abstractions for future scale

## Locked Stack

Treat these as fixed unless I explicitly approve a change:

- Next.js
- Prisma ORM
- Neon Postgres
- Auth.js
- Google Calendar API
- Vercel hosting
- Vercel AI SDK with `streamText`
- Vitest for unit and integration tests
- Playwright for E2E tests

Do not suggest replacing core stack choices unless there is a concrete blocker.

## Required Docs

Claude must consult repository docs before making non-trivial changes, especially when they affect product behavior, architecture, or testing flow.

Primary docs:

- `docs/tdd-workflow.md`
- `docs/architecture.md`
- `docs/project-plan.md`
- `docs/personas-and-stories.md`

Specs:

- `docs/specs/001-ai-schedule-chat.md`
- `docs/specs/002-calendar-connection.md`
- `docs/specs/003-auth-family-access.md`
- `docs/specs/004-privacy-controls.md`
- `docs/specs/005-shared-notes.md`

Reference docs to use when relevant:

- `docs/notes/neon-integration.md`
- `docs/notes/google-oauth-calendar-setup.md`
- `docs/notes/prisma-vercel-integration.md`
- `docs/notes/ai-chat-vercel-notes-repo.md`
- `docs/testing-summary-template.md`

## TDD Rule

Always read and follow `docs/tdd-workflow.md` before implementing or modifying features.

This repo is explicitly spec-driven and TDD-oriented. For feature work and behavior changes, Claude should write or update tests first, then implement. Do not skip this unless I explicitly instruct otherwise for a narrowly scoped reason.

If a task touches an existing spec, align the work with that spec before coding. If the requested work appears to conflict with a spec or the documented TDD workflow, stop and call out the mismatch.

## Working Style

For each meaningful task, Claude should:

1. Restate its understanding of the request in 1 to 3 concise sentences.
2. Present a short checklist-style plan before making changes.
3. Implement in small, coherent steps rather than a large multi-file rewrite.
4. Keep chat explanations concise by default.
5. After changes, summarize what changed, where it changed, and what I should test.

Do not dump large patches or full diffs in chat by default. Instead, summarize the touched files and the important code paths or sections.

## When To Expand Explanations

Stay brief unless one of these is true:

- Performance characteristics may change
- Security or privacy risk may change
- The work affects architecture, shared patterns, or future implementation constraints
- The work touches risky areas listed below

In those cases, explain the reasoning more clearly and call out the tradeoffs.

## Risky Areas

Be extra cautious and more explicit when working in these areas:

- Prisma schema and migrations
- Auth configuration
- Google OAuth or Calendar integration
- AI prompt construction
- Privacy filtering logic
- Shared core utilities used by schedule parsing or auth

For risky changes, Claude should first:

1. Summarize current behavior.
2. Propose the intended change with a brief rationale.
3. Ask for confirmation before proceeding if the impact is broad, difficult to undo, or likely to affect multiple features.

## Implementation Rules

Treat these as important project decisions:

- AI schedule chat is the main differentiator and should be treated as the core feature.
- Privacy is a first-class constraint, not a later cleanup item.
- Google Calendar is the only calendar provider for the MVP.
- Google OAuth is required for private calendar reads.
- Neon is the database host.
- Prisma should use pooled runtime DB access and direct URL for migrations and admin tasks.
- AI chat should use an App Router Route Handler plus streaming.
- Privacy filtering must happen before any AI prompt is built.
- AI prompts should stay compact and be based on schedule summaries, not raw event dumps.
- The product must work well on both mobile and desktop.

Do not introduce architecture that assumes multiple calendar providers, agentic AI actions, or enterprise-scale background systems unless explicitly requested.

## Refactors

Claude should suggest cleaner refactors when code is obviously messy, repetitive, or fighting the current architecture. Do not blindly implement the literal wording of a request if there is a clearly safer or cleaner repo-aligned approach.

However, before broad refactors or changes that are hard to reverse, Claude must ask first. Examples include:

- Restructuring auth flows
- Reworking Prisma models
- Changing privacy enforcement boundaries
- Replacing shared utility patterns
- Reorganizing major app routing or data flow

## Testing Rules

This repo is TDD-oriented, but Claude should still act pragmatically.

- Start from `docs/tdd-workflow.md`.
- Create or update tests before implementation when changing behavior.
- Prefer keeping tests close to the feature they cover.
- After larger backend changes or refactors, run or recommend the appropriate test suite before considering the task complete.
- Assume a failing test is correct by default and try to fix the implementation first.
- Do not silently rewrite, weaken, or delete tests just to make the suite pass.

If Claude believes a test is wrong:

1. Explain why it appears incorrect.
2. Point to the conflicting behavior, spec, or implementation expectation.
3. Ask for confirmation before modifying or removing that test.

## Test Placement

Prefer test files to live with the related feature or component, using a local test folder inside that feature area.

Examples:

- `src/features/schedule-chat/__tests__/...`
- `src/components/calendar/__tests__/...`
- `app/(dashboard)/family/__tests__/...`

Avoid pushing most tests into a single distant global test directory unless the repo already has a strong established reason to do so. Co-located tests should make feature ownership and maintenance easier.

Use judgment based on the actual repo structure, but default to feature-local test placement.

## Protected Areas

The only global protected area defined here is test integrity:

- Do not rewrite tests just to green the suite.
- Do not remove failing coverage without explicit approval when behavior is still required.

Additional protected files, directories, or patterns may be defined in `AGENTS.md` or other repo-level instructions. Claude must check and respect those before editing.

## Branching Guidance

For this repo, advise when to create a new branch for any task that is more than a tiny typo, copy tweak, or obviously isolated doc fix.

Use a branch when:

- Building a new feature
- Working from a spec in `docs/specs/`
- Changing auth, schema, privacy, AI, or calendar integration
- Performing a refactor
- Touching several files
- Running an experiment you may want to discard

You can usually work directly on `main` only for very small, low-risk documentation or text-only changes.

Recommended branch naming patterns:

- `feat/ai-schedule-chat`
- `feat/google-calendar-connection`
- `feat/privacy-controls`
- `fix/auth-session-edge-case`
- `fix/calendar-sync-timezone`
- `refactor/schedule-summary-builder`
- `chore/test-coverage-shared-notes`

Merge back into `main` when all of the following are true:

1. The scoped task is complete.
2. Relevant tests pass or the exact remaining gap is clearly documented.
3. The change stays within MVP scope.
4. The branch does not contain unrelated experimental work.
5. The implementation matches the spec and TDD workflow for that task.

Prefer small feature branches merged frequently over long-lived branches that drift from `main`.

## Command Conventions

All shell commands must be PowerShell-friendly.

Do not use bash-specific syntax such as:

- `export FOO=bar`
- `VAR=value command`
- `&&` chains written with bash assumptions
- other bash-only shell idioms

When suggesting commands, use PowerShell-compatible forms and call out any cross-platform differences if relevant.

## Styling Units

Use dynamic, relative sizing throughout the app rather than fixed pixel values.

- Use `rem` for sizing (widths, heights, padding, margin, border-radius, font-size, gaps) so layout scales with the user's root font size instead of being locked to a fixed pixel grid.
- Use viewport-relative units (`vh`, `vw`, `calc(100vh - ...)`, etc.) when sizing needs to respond to the visible window, such as panels that should fill remaining viewport height.
- Use `px` only when a value must be exact and unaffected by scaling — e.g. 1px hairline borders, or matching a fixed external constraint (like an icon's native pixel dimensions).
- When converting or introducing new sizing, prefer `rem` first, then viewport units, and fall back to `px` only when neither fits.

## Code Comments

In new or heavily modified code, add concise professional comments where they improve clarity.

Comments should:

- Explain why something exists
- Clarify non-obvious behavior
- Help a teammate understand decisions quickly

Comments should not:

- Narrate obvious line-by-line logic
- Mention Claude, AI, or model behavior
- Use informal filler or self-referential phrasing

Write comments as if they were intentionally authored by a strong teammate.

## Completion Standard

Before considering a task done, Claude should verify that:

- The work aligns with the relevant spec and `docs/tdd-workflow.md`
- Tests were added or updated appropriately
- Risky areas received the right level of caution
- The implementation remains MVP-scoped
- The summary includes changed files and recommended test coverage
- Any needed follow-up checks are clearly stated

## Response Template

For non-trivial coding tasks, Claude should generally follow this interaction pattern:

1. Briefly restate the request.
2. Provide a short checklist-style plan.
3. Ask focused clarifying questions if ambiguity or risk is present.
4. Implement in small, coherent steps.
5. Summarize:
   - what changed
   - where it changed
   - what to test
   - any notable risk or follow-up

## Git Reminder

Git workflow rules and any required commit prefixes are governed by `AGENTS.md` first.

Claude may suggest branch names and draft commit messages for the work it completes, but it must not imply that it created branches, committed changes, merged code, or performed git operations itself.

I will create branches, make commits, and handle merges myself.

When helpful, Claude should provide:

- A suggested branch label or branch name for the task
- A suggested commit message using the repo’s expected format from `AGENTS.md`
- For larger tasks, a small set of logically separated commit message suggestions if the work is best committed in stages

Claude should treat branch creation, committing, rebasing, squashing, and merging as user-owned actions unless I explicitly ask for git command suggestions.