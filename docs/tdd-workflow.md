# TDD Workflow

## Testing Stack: Vitest + Playwright
Vitest will be used for fast unit and integration tests, while Playwright will be used for end-to-end tests covering the main user workflows in a real browser.

## Process Rules
- Write tests before implementation for each feature.
- Run the tests first and confirm the expected failing or incomplete state.
- Build only enough code to satisfy the approved tests.
- Refactor only after tests pass and behavior matches the spec.
- Log each test-writing prompt used during development.
- Keep commits clearly separated into test creation, implementation, and cleanup or debugging stages.

## Required Checkpoint Sequence

This sequence applies whenever TDD is in effect for a piece of work (i.e. it has not been explicitly waived for a small, non-TDD fix). The agent must stop and wait for explicit approval at each checkpoint below — it must never skip a checkpoint, combine two checkpoints into one turn, or continue on its own judgment past a stop point.

1. **Summarize the proposed change.** Before writing any test or code, restate the feature/fix and the planned approach. Stop. Wait for explicit approval before proceeding.
2. **Write the failing test(s) only.** No implementation code yet — test files only.
3. **Run the tests and confirm RED.** Show the failing output as proof the gap is real. Without being asked, redirect the output to a new file in `docs/tdd/logs/`, numbered one higher than the highest existing log file in that folder (e.g. if `27-*.txt` is the highest, this is `28-<short-description>-red.txt`). Use the PowerShell `Tee-Object` pattern already shown earlier in this file.
4. **Update `docs/tdd/logs/test-tracking.md`** without being asked: add a new entry at the top of the file (entries are most-recent-first) following the existing format — a header line describing the fix/feature, the test count and result, files touched, and a reference to the RED log file just captured.
5. **Stop.** Give a suggested commit message for the RED state. Wait for the user to commit. The agent does not commit, push, or otherwise advance git state itself — see the Git Reminder rule in `CLAUDE.md`.
6. **Only after the user confirms they're ready to continue**, write the minimal implementation needed to pass the approved tests — nothing extra, no incidental refactors bundled in.
7. **Re-run the tests and confirm GREEN.** Capture this run the same way, as `<same-number>-<short-description>-green.txt`.
8. **Update `test-tracking.md` again**, same as step 4, with the GREEN result and a reference to the GREEN log file.
9. **Stop.** Give a suggested commit message for the GREEN state. Wait for the user to commit before considering the task finished.

If at any point the agent is unsure whether a checkpoint has been cleared, it must ask rather than assume and continue.

## Test-Writing Prompts

### AI Schedule Chat
> You are a test-writing assistant. Using the following user story, acceptance criteria, and feature spec, write tests for Next.js + Vitest + Playwright. Do not change the specs, just cover them. Ask clarifying questions if anything is ambiguous. Focus on integration tests for schedule-query logic and end-to-end tests for the user asking natural-language calendar questions in the UI. Cover allowed queries, privacy-restricted results, incomplete data handling, and unsupported-question responses.

### Calendar Connection and Shared Schedule
> You are a test-writing assistant. Using the following user story, acceptance criteria, and feature spec, write tests for Next.js + Vitest + Playwright. Do not change the specs, just cover them. Ask clarifying questions if anything is ambiguous. Focus on integration tests for connected calendar data, shared availability calculations, and missing-data behavior, plus end-to-end tests for viewing the combined family schedule.

### Auth and Family Access
> You are a test-writing assistant. Using the following user story, acceptance criteria, and feature spec, write tests for Next.js + Vitest + Playwright. Do not change the specs, just cover them. Ask clarifying questions if anything is ambiguous. Focus on integration tests for authentication and authorization rules, and end-to-end tests for sign-in, protected routes, family-group creation, and membership visibility.

### Privacy and Visibility Controls
> You are a test-writing assistant. Using the following user story, acceptance criteria, and feature spec, write tests for Next.js + Vitest + Playwright. Do not change the specs, just cover them. Ask clarifying questions if anything is ambiguous. Focus on integration tests for visibility-setting logic and end-to-end tests confirming that hidden event titles stay hidden in both the schedule view and AI responses.

### Shared Family Notes
> You are a test-writing assistant. Using the following user story, acceptance criteria, and feature spec, write tests for Next.js + Vitest + Playwright. Do not change the specs, just cover them. Ask clarifying questions if anything is ambiguous. Focus on integration tests for note creation and editing rules, and end-to-end tests for viewing and updating the shared family note as an authorized member.

## Testing Guardrails
- Do not write implementation before the relevant tests are drafted.
- Do not rewrite, weaken, or delete tests just to make them pass.
- Do not claim a feature is done unless the related tests pass and behavior matches the written spec.
- Keep tests aligned to the approved user stories and acceptance criteria, not guessed behavior.
- Keep a running log of test-writing prompts and total tests created.
- Any Markdown files created only for tracking testing activity, prompt logs, or temporary test notes must be excluded from version control through the repository’s `.gitignore` rules.