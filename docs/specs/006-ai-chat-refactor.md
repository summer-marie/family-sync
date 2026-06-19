# Spec 006 — AI Schedule Chat Refactor

## Overview

The current AI chat gates every user question through a keyword classifier (`question-parser.ts`) before it ever reaches the AI model. If the question doesn't match one of four hardcoded patterns, the model never sees it — the user gets a canned fallback message instead. This breaks the core product promise: natural-language scheduling questions answered by AI.

This refactor removes the keyword gate entirely, expands the schedule fetch window from 7 to 90 days, adds multi-turn conversation memory (client-side, session-scoped), and gives the AI a proper system prompt that handles scope enforcement naturally.

---

## Goals

- Any natural-language scheduling question works — "is anybody free Friday?", "how does December look?", "when can we all get together?" — without requiring the user to phrase it a specific way.
- The AI gently redirects clearly off-topic questions without a hardcoded fallback.
- Users can ask follow-up questions that reference prior answers in the same chat session.
- Schedule data covers 90 days so questions about future months are answerable.
- The 90-day schedule is fetched once per page session, not on every message.

---

## Out of Scope for This Refactor

- Persistent chat history across sessions (no DB-backed memory)
- Calendar write actions
- Background schedule sync
- Non-Google calendar providers
- Multi-family-group membership (MVP: one group per user)

---

## Architecture Changes

### 1. Remove `question-parser.ts` from the chat route

`src/app/api/chat/route.ts` currently calls `parseQuestion()` and returns early with a JSON fallback if the result is `OUT_OF_SCOPE`. This block is removed entirely. Every authenticated, authorized question goes to the model.

`question-parser.ts` itself can be deleted. Its tests should also be removed or clearly marked as deleted in the TDD log.

### 2. System prompt — scope enforcement via AI, not code

A system prompt is added to `src/lib/schedule/prompt-builder.ts`. It is never visible to users. It gives the model its role, context, and behavioral rules.

The system prompt must:
- Identify the AI as a family scheduling assistant
- Reference the family group name dynamically (pulled from the DB, passed into the prompt builder)
- Describe the schedule data format the AI will receive
- Instruct the AI to answer any scheduling question naturally
- Instruct the AI to gently redirect clearly off-topic questions
- Instruct the AI never to invent events or fabricate availability
- Instruct the AI that privacy-hidden events will appear as "Busy" with no title — it must not speculate about their content

### 3. Expand schedule fetch to 90 days (AI only)

The schedule page UI keeps its 7-day window — that is the right scope for a visual calendar view. The 90-day fetch is for the AI only.

The chat API route (`src/app/api/chat/route.ts`) fetches 90 days independently when a question is asked. This fetch is separate from what the page renders. The UI and the AI chat are on different data windows by design.

### 4. Session-scoped schedule cache

The API route fetches the 90-day schedule on the first chat message and the result is cached in the `ChatWidget`'s React state. Subsequent messages in the same session reuse that cached schedule — no repeat Google Calendar fetches per message.

This means:
- On the first message, the API route fetches 90 days and returns the schedule alongside the streamed response (or as a separate field)
- `ChatWidget` stores the schedule in state after the first response
- Subsequent POST bodies include the cached schedule so the route skips the fetch

**Privacy note:** privacy filtering always runs server-side inside `getFamilySchedule`. The client only ever receives filtered data.

### 5. Multi-turn conversation memory (client-side)

`ChatWidget` maintains a `messages` array in React state. Each entry is `{ role: 'user' | 'assistant', content: string }`. On each submit, the new user message is appended, the full array is sent to the API route, and the streamed assistant reply is appended when complete.

The API route passes the full messages array to `streamText` instead of a single question string. The system prompt is prepended as the first message with `role: 'system'`.

This gives the model full context of the conversation so follow-up questions like "what about Saturday?" work correctly.

---

## File Changes

| File | Change |
|------|--------|
| `src/lib/schedule/question-parser.ts` | Delete |
| `src/lib/schedule/__tests__/question-parser.test.ts` | Delete (log deletion in TDD log) |
| `src/lib/schedule/prompt-builder.ts` | Rewrite to accept `{ familyName, schedule, messages }`, return messages array with system prompt prepended |
| `src/app/api/chat/route.ts` | Remove parser gate; accept `messages` + `schedule` from body; no longer fetches schedule; passes messages array to `streamText` |
| `src/app/schedule/page.tsx` | No change — UI keeps 7-day fetch |
| `src/components/chat/chat-widget.tsx` | Full rewrite — chat thread UI, auto-growing input, streaming indicator, error state |

---

## UI Spec — Chat Widget

The `ChatWidget` is a full rewrite from a single input/response box to a proper chat thread experience.

### Chat thread display

- Messages render as a scrollable thread, styled like a text message conversation
- **User messages** — right-aligned bubble, amber/warm background
- **AI messages** — left-aligned bubble, dark card background
- The thread grows to a max height (e.g. `max-h-[480px]`) then scrolls vertically
- On each new message, the view auto-scrolls to the bottom so the latest message is always visible
- A scrollbar is accessible to review earlier turns in the conversation

### Streaming / thinking indicator

- While the AI is generating a response, a left-aligned AI bubble appears immediately with an animated blinking indicator (three pulsing dots) so the user knows something is happening
- As the streamed text arrives, it replaces the blinking dots and renders progressively in the same bubble — the user sees the response appear word by word
- The indicator must be visible before the first token arrives so there is no silent waiting period

### Error state

- If the request fails, an error bubble appears in the AI position (left-aligned)
- The bubble uses a distinct error style (e.g. red-tinted border) so it is clearly not a normal AI response
- Error message: "Something went wrong — please try again."
- The conversation history is preserved so the user can retry without losing context

### Input box

- Auto-growing textarea — starts at single-line height, expands as the user types
- Capped at approximately 5 lines tall; beyond that the textarea scrolls internally
- **Enter** submits the message; **Shift+Enter** inserts a newline
- Disabled while a response is streaming
- Clears automatically after submit
- Send button to the right of the input, disabled while streaming or input is empty

### Token growth note

Each conversation turn appends to the messages array sent to the model. GPT-4o-mini's 128k context window makes this safe for normal family scheduling conversations. No mitigation is required for MVP, but this is a known tradeoff to monitor if conversations grow unusually long.

---

## System Prompt (stored in `prompt-builder.ts`)

```
You are a scheduling assistant for the ${familyName} family.
You have access to the family's calendar data for the next 90 days.
Each family member's events are listed with their name, event title, and start time.
Events marked as "Busy" have no title — a family member has chosen to keep that event private. Do not speculate about what those events are.
Answer any scheduling question naturally and helpfully.
If someone asks something clearly unrelated to scheduling, respond warmly and redirect them: let them know you can only help with the family schedule.
Never invent events, availability, or times that are not in the data provided.
If the schedule data shows no events for a member, say they appear to have nothing scheduled — do not claim they are definitely free.
```

---

## TDD Stop Points and Commit Sequence

Follow this exact sequence. Do not skip stops. Each stop is a commit.

After every RED and GREEN run, the log file must be saved to `docs/tdd/logs/` using the numbered filename listed at each stop. After each stop that produces a log, update `docs/tdd/logs/test-tracking.md` with a new entry following the same format as prior steps — include the stop name, test count, file names, failure reasons (for RED), and the log filename.

### Stop 1 — Remove the parser (no tests yet)
- Delete `question-parser.ts` and its test file
- Remove the `parseQuestion` call from `route.ts`
- The route will be temporarily broken (no system prompt, no messages array yet) — that is acceptable at this stop
- **Commit:** `refactor: remove question-parser gate from AI chat route`

### Stop 2 — Write failing unit tests (RED)
Write tests before touching `prompt-builder.ts` or `chat-widget.tsx`.

Tests to write:
- `src/lib/schedule/__tests__/prompt-builder.test.ts`
  - system prompt includes the family name
  - system prompt includes a privacy instruction about "Busy" events
  - messages array is returned with system prompt as first entry
  - user and assistant messages are appended after system prompt
  - schedule data is serialized into the system context correctly
  - empty schedule produces a safe prompt (no invented events)

- `src/app/api/chat/__tests__/route.test.ts` (update existing or create)
  - unauthenticated request returns 401
  - missing `familyGroupId` returns 400
  - missing `messages` array returns 400
  - valid request calls `streamText` with the full messages array
  - privacy-hidden events do not appear as titled events in the prompt context

Capture RED log:
```powershell
npx vitest run src/lib/schedule/__tests__/prompt-builder.test.ts src/app/api/chat/__tests__/route.test.ts 2>&1 | Tee-Object -FilePath docs/tdd/logs/14-ai-chat-refactor-red.txt
```

**Commit:** `test: red — prompt-builder and chat route refactor tests`

### Stop 3 — Implement to green (GREEN)
- Rewrite `prompt-builder.ts` to pass all unit tests
- Update `route.ts` to accept `messages` + `schedule`, pass to `streamText`
- Run the suite and confirm green

Capture GREEN log:
```powershell
npx vitest run src/lib/schedule/__tests__/prompt-builder.test.ts src/app/api/chat/__tests__/route.test.ts 2>&1 | Tee-Object -FilePath docs/tdd/logs/14-ai-chat-refactor-green.txt
```

**Commit:** `feat: open-ended AI chat with system prompt and multi-turn memory`

### Stop 4 — Write failing Playwright E2E tests (RED)
Write E2E tests before updating the UI components.

File: `e2e/ai-chat-refactor.spec.ts`

Tests:
- natural-language question ("is anybody free Friday") gets a real AI response, not a fallback message
- follow-up question ("what about Saturday?") gets a contextually correct response
- off-topic question gets a gentle redirect, not a crash or error state
- member with no calendar connected — AI response acknowledges missing data gracefully
- privacy-hidden member — AI response uses "Busy" not the event title
- empty schedule (no events in 90-day window) — AI does not claim the member is definitely free, says no events found
- blinking indicator appears while AI is generating a response
- streamed text replaces the indicator progressively in the same bubble
- error state renders a distinct error bubble, conversation history is preserved
- user message appears right-aligned, AI message appears left-aligned
- Shift+Enter inserts a newline, Enter submits
- input clears after submit
- chat window scrolls to the latest message automatically
- scrollbar allows reviewing earlier turns

Capture RED log:
```powershell
npx playwright test e2e/ai-chat-refactor.spec.ts 2>&1 | Tee-Object -FilePath docs/tdd/logs/14-ai-chat-refactor-e2e-red.txt
```

**Commit:** `test: red — E2E tests for open-ended AI chat refactor`

### Stop 5 — Implement UI to green (GREEN)
- Update `schedule/page.tsx` to fetch 90 days and pass `schedule` prop to `ChatWidget`
- Rewrite `ChatWidget` to use messages array, multi-turn state, and pass `schedule` in POST body
- Run Playwright and confirm green

Capture GREEN log:
```powershell
npx playwright test e2e/ai-chat-refactor.spec.ts 2>&1 | Tee-Object -FilePath docs/tdd/logs/14-ai-chat-refactor-e2e-green.txt
```

**Commit:** `feat: 90-day schedule fetch, session-cached schedule, multi-turn chat UI`

---

## Edge Cases to Cover in Tests

These must be explicitly checked — do not leave them to manual testing:

| Edge Case | Where to Test |
|-----------|---------------|
| Member has no calendar connected | Vitest unit + Playwright E2E |
| Member referenced by name does not exist in the family group | Vitest unit (prompt builder receives no matching entry) |
| All members are busy the entire visible window | Vitest unit |
| Question references a date beyond the 90-day window | Playwright E2E — AI should say data is not available, not hallucinate |
| Privacy-hidden events — AI must not reveal or speculate about titles | Vitest unit + Playwright E2E |
| Empty question submitted | Playwright E2E — submit button should be disabled; route returns 400 if bypassed |
| Unauthenticated request to chat route | Vitest integration — 401 |
| `familyGroupId` belongs to a different family | Vitest integration — 403 |
| Very long conversation history (10+ turns) | Playwright E2E — ensure no crash, prompt stays within reasonable size |
| Off-topic question (e.g. "what is the weather?") | Playwright E2E — gentle redirect, not an error |

---

## Risks

- **Prompt size:** 90 days × multiple family members could be a large context. The existing `normalize.ts` summary format mitigates this — verify the serialized schedule stays compact.
- **Cost:** GPT-4o-mini is inexpensive but 90-day fetches sent in every prompt will add up. Session caching (pass schedule from page, not re-fetch per message) is the primary mitigation.
- **Multi-turn hallucination:** the model may reference prior messages incorrectly. This is an acceptable MVP risk — no mitigation required beyond the system prompt instruction to not invent events.
- **Google Calendar API rate limits:** expanding to 90 days increases the event window. Monitor for quota errors. If they appear, add a per-user fetch throttle.

---

## Done Criteria

- [ ] `question-parser.ts` is deleted and no longer referenced anywhere
- [ ] Any natural-language scheduling question produces an AI response
- [ ] Off-topic questions produce a gentle redirect
- [ ] Follow-up questions referencing prior answers work correctly
- [ ] Privacy-hidden events appear as "Busy" in all AI responses
- [ ] Schedule covers 90 days from today
- [ ] Schedule is fetched once per page session, not per message
- [ ] All 5 TDD stop commits exist in git history in order
- [ ] All edge cases in the table above have a corresponding test
- [ ] No existing privacy or auth tests are broken
