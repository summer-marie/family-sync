# AI chat on Vercel Hobby notes

## Decision

Use Vercel Hobby for the MVP AI chat and implement the chat route with a Next.js App Router Route Handler plus Vercel AI SDK `streamText`.

## Why this option

- Fits the current stack.
- Lowest ops overhead.
- Good demo UX because responses start immediately.
- Good enough for a one-week MVP if prompt size and route logic stay small.

## Core implementation plan

### Route shape

Use a server route for chat, for example:

- `app/api/chat/route.ts`

High-level flow:

1. Authenticate the user.
2. Validate that the user belongs to the family group they are querying.
3. Load only the schedule data the user is allowed to see.
4. Apply privacy filtering before building AI context.
5. Convert schedule data into a compact summary.
6. Call `streamText`.
7. Stream the response back to the client.

## Rules for the MVP

- Keep the prompt small.
- Do not send raw large event dumps if avoidable.
- Do privacy filtering before the AI sees the data.
- Keep the supported question types narrow.
- Keep answers short and factual.
- Do not support AI actions or calendar edits.

## Suggested supported question types

Support only a few clear question types for demo week:

- Is everyone free at a certain time?
- Who is busy during a certain window?
- What time window is everyone free?
- Summarize conflicts for a day.

If a question is out of scope, return a short fallback message.

## Data strategy

The AI route should not query everything blindly.

Recommended flow:

- Pull or load normalized schedule data.
- Reduce it to only the time range relevant to the question.
- Remove hidden titles if privacy settings require it.
- Pass a compact structured summary into the prompt.

## Minimal prompt strategy

Prompt should include:

- User question.
- Relevant date/time range.
- Authorized family availability summary.
- Clear instruction to answer only from provided schedule data.
- Clear instruction not to invent events or unsupported actions.

## UI notes

- Show streaming text in the chat UI as it arrives.
- Show a loading state immediately after submit.
- Disable duplicate submits while one request is in flight.
- Show a clean fallback error state if the route fails.

## What to avoid this week

- Multi-step agents.
- Tool-calling loops inside the model.
- Very long prompts.
- Background orchestration.
- Calendar write actions.
- Complex chat memory.

## Files likely involved

- `app/api/chat/route.ts`
- `lib/ai.ts`
- `lib/schedule/normalize.ts`
- `lib/schedule/privacy.ts`
- `lib/schedule/question-parser.ts`
- `components/chat/*`

## Testing plan

### Unit tests

- Question classification or question-type detection.
- Privacy filter removes hidden titles correctly.
- Schedule normalization returns expected compact format.
- Prompt builder includes only allowed data.
- Out-of-scope fallback logic works.

### Integration tests

- Authenticated user can call the chat route.
- Unauthorized user is rejected.
- Route only loads data for the correct family group.
- Hidden-title settings are respected before prompt creation.
- Empty or incomplete schedule data returns a safe response.
- Route returns a streaming response successfully.

### End-to-end tests

- User opens chat and submits a supported question.
- Response begins appearing without waiting for the full completion.
- User sees correct answer for a known schedule fixture.
- User with restricted visibility does not see hidden titles in the answer.
- Error state appears cleanly if the request fails.

## Demo-week success criteria

This option is good enough if:

- Chat starts responding immediately.
- At least 2 to 4 supported question types work reliably.
- Privacy rules are enforced in AI responses.
- Response time feels acceptable on Vercel Hobby.
- The route works locally and on the hosted demo app.

## Fallback plan

If streaming works but model behavior is shaky:

- Shrink supported question types further.
- Reduce prompt size.
- Use deterministic schedule summaries before the model step.
- Return shorter answers.

If the model route is still too risky for demo day:

- Keep the streamed UI.
- Limit the assistant to one or two canned schedule-analysis patterns.
- Treat the AI layer as a thin natural-language formatter over precomputed availability logic.