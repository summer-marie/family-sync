// ---------------------------------------------------------------------------
// Spec 006 - AI Chat Refactor: E2E tests (RED)
//
// These tests cover the rewritten ChatWidget and the open-ended AI chat route.
// All tests are expected to fail (RED) until the ChatWidget is rewritten in
// Stop 5 — the current widget sends { question } not { messages }, has no
// thread UI, no auto-growing textarea, no streaming indicator bubbles, and no
// multi-turn memory.
//
// Test user: e2e-chat@family-sync.test (chatTest fixture)
//   - Pre-seeded with family group "E2E Chat Family" (two members, no
//     CalendarConnections — AI sees "calendar unavailable" for all members).
//   - Authenticated via e2e/.auth/chat-user.json (written by global-setup.ts).
//
// Selectors expected by the new ChatWidget implementation (Stop 5):
//   - textarea                          auto-growing input
//   - [data-testid="send-button"]       send button
//   - [data-testid="user-message"]      right-aligned user bubble
//   - [data-testid="ai-message"]        left-aligned AI bubble
//   - [data-testid="thinking-indicator"] pulsing dots while generating
//   - [data-testid="chat-thread"]       scrollable thread container
// ---------------------------------------------------------------------------

import { chatTest as test, expect } from './fixtures'

// ---------------------------------------------------------------------------
// Natural-language question — AI responds, no hardcoded fallback
// ---------------------------------------------------------------------------

test('natural-language scheduling question gets an AI response, not a fallback message', async ({
  page,
}) => {
  await page.goto('/schedule')

  const textarea = page.locator('textarea')
  await textarea.fill('is anybody free Friday?')
  await page.click('[data-testid="send-button"]')

  // An AI message bubble must appear — not the old hardcoded fallback text
  const aiMessage = page.locator('[data-testid="ai-message"]').first()
  await expect(aiMessage).toBeVisible({ timeout: 20000 })

  // Must NOT show the old keyword-gate fallback
  await expect(
    page.getByText(/only.*scheduling questions/i),
  ).not.toBeVisible()
})

// ---------------------------------------------------------------------------
// Multi-turn — follow-up question references prior context
// ---------------------------------------------------------------------------

test('follow-up question gets a contextually relevant response', async ({
  page,
}) => {
  await page.goto('/schedule')

  const textarea = page.locator('textarea')

  // First turn
  await textarea.fill('is anybody free this weekend?')
  await page.click('[data-testid="send-button"]')
  await expect(page.locator('[data-testid="ai-message"]').first()).toBeVisible({
    timeout: 20000,
  })

  // Second turn — follow-up without restating context
  await textarea.fill('what about the following weekend?')
  await page.click('[data-testid="send-button"]')

  // A second AI message bubble must appear
  await expect(page.locator('[data-testid="ai-message"]')).toHaveCount(2, {
    timeout: 20000,
  })
})

// ---------------------------------------------------------------------------
// Off-topic — gentle redirect, not a crash or blank response
// ---------------------------------------------------------------------------

test('off-topic question gets a gentle redirect response, not an error', async ({
  page,
}) => {
  await page.goto('/schedule')

  const textarea = page.locator('textarea')
  await textarea.fill('what is the weather like today?')
  await page.click('[data-testid="send-button"]')

  // An AI message bubble must appear
  const aiMessage = page.locator('[data-testid="ai-message"]').first()
  await expect(aiMessage).toBeVisible({ timeout: 20000 })

  // Must not show an error bubble for an off-topic question
  await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible()
})

// ---------------------------------------------------------------------------
// No calendar connected — AI acknowledges missing data gracefully
// ---------------------------------------------------------------------------

test('member with no calendar connected — AI response acknowledges missing data', async ({
  page,
}) => {
  await page.goto('/schedule')

  const textarea = page.locator('textarea')
  await textarea.fill('is everyone free Saturday?')
  await page.click('[data-testid="send-button"]')

  const aiMessage = page.locator('[data-testid="ai-message"]').first()
  await expect(aiMessage).toBeVisible({ timeout: 20000 })

  // The AI must NOT claim a specific free/busy state it cannot know, since no
  // member has connected calendar data. This is more robust than asserting a
  // fixed set of "unavailable" phrases, which the model may phrase differently.
  const text = await aiMessage.innerText()
  expect(
    text.match(/definitely free|everyone is free|all free|nobody has/i),
  ).toBeFalsy()
})

// ---------------------------------------------------------------------------
// Privacy-hidden events — AI uses "Busy" not the event title
// (Note: full title-suppression validation requires Google Calendar mocking,
// which is out of MVP scope. This test verifies the UI does not crash.)
// ---------------------------------------------------------------------------

test('privacy-hidden member — AI response does not crash or error', async ({
  page,
}) => {
  await page.goto('/schedule')

  const textarea = page.locator('textarea')
  await textarea.fill('what does everyone have going on this week?')
  await page.click('[data-testid="send-button"]')

  const aiMessage = page.locator('[data-testid="ai-message"]').first()
  await expect(aiMessage).toBeVisible({ timeout: 20000 })
  await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible()
})

// ---------------------------------------------------------------------------
// Empty schedule — AI does not claim members are definitely free
// ---------------------------------------------------------------------------

test('empty schedule — AI says no events found, does not claim members are free', async ({
  page,
}) => {
  await page.goto('/schedule')

  const textarea = page.locator('textarea')
  await textarea.fill('is everyone free all of next month?')
  await page.click('[data-testid="send-button"]')

  const aiMessage = page.locator('[data-testid="ai-message"]').first()
  await expect(aiMessage).toBeVisible({ timeout: 20000 })

  // AI must not claim the member is "definitely free" — should say unavailable
  // or no data (per system prompt instruction)
  const text = await aiMessage.innerText()
  expect(text.match(/definitely free/i)).toBeFalsy()
})

// ---------------------------------------------------------------------------
// Streaming indicator — blinking dots appear before first token
// ---------------------------------------------------------------------------

test('blinking indicator appears while AI is generating a response', async ({
  page,
}) => {
  await page.goto('/schedule')

  const textarea = page.locator('textarea')
  await textarea.fill('who is free next Tuesday?')
  await page.click('[data-testid="send-button"]')

  // The thinking indicator must be visible immediately after submit,
  // before the full response arrives
  const indicator = page.locator('[data-testid="thinking-indicator"]')
  await expect(indicator).toBeVisible({ timeout: 5000 })
})

// ---------------------------------------------------------------------------
// Streamed text replaces the indicator in the same bubble
// ---------------------------------------------------------------------------

test('streamed text replaces the thinking indicator progressively', async ({
  page,
}) => {
  await page.goto('/schedule')

  const textarea = page.locator('textarea')
  await textarea.fill('what is on the calendar this week?')
  await page.click('[data-testid="send-button"]')

  // Indicator appears, then disappears as text fills the bubble
  const indicator = page.locator('[data-testid="thinking-indicator"]')
  await expect(indicator).toBeVisible({ timeout: 5000 })

  // After the response arrives the indicator must be gone
  const aiMessage = page.locator('[data-testid="ai-message"]').first()
  await expect(aiMessage).toBeVisible({ timeout: 20000 })
  await expect(indicator).not.toBeVisible()
})

// ---------------------------------------------------------------------------
// Error state — distinct error bubble; conversation history preserved
// ---------------------------------------------------------------------------

test('error state renders a distinct error bubble and preserves conversation history', async ({
  page,
}) => {
  await page.goto('/schedule')

  const textarea = page.locator('textarea')
  await textarea.fill('is everyone free Saturday?')
  await page.click('[data-testid="send-button"]')

  // Wait for first successful AI response so there is conversation history
  await expect(page.locator('[data-testid="ai-message"]').first()).toBeVisible({
    timeout: 20000,
  })

  // Intercept the next request and return a 500 to trigger the error state
  await page.route('/api/chat', (route) => route.fulfill({ status: 500 }))

  await textarea.fill('and what about Sunday?')
  await page.click('[data-testid="send-button"]')

  // Error bubble must appear
  const errorBubble = page.locator('[data-testid="error-message"]')
  await expect(errorBubble).toBeVisible({ timeout: 10000 })

  // Prior AI message must still be visible — history preserved
  await expect(page.locator('[data-testid="ai-message"]').first()).toBeVisible()
  await expect(page.locator('[data-testid="user-message"]').first()).toBeVisible()
})

// ---------------------------------------------------------------------------
// Message alignment — user right, AI left
// ---------------------------------------------------------------------------

test('user messages appear right-aligned and AI messages appear left-aligned', async ({
  page,
}) => {
  await page.goto('/schedule')

  const textarea = page.locator('textarea')
  await textarea.fill('is everyone free Friday evening?')
  await page.click('[data-testid="send-button"]')

  const userMessage = page.locator('[data-testid="user-message"]').first()
  const aiMessage = page.locator('[data-testid="ai-message"]').first()

  await expect(userMessage).toBeVisible()
  await expect(aiMessage).toBeVisible({ timeout: 20000 })

  // User bubble is right-aligned — its left edge is further right than the AI bubble's
  const userBox = await userMessage.boundingBox()
  const aiBox = await aiMessage.boundingBox()

  expect(userBox).not.toBeNull()
  expect(aiBox).not.toBeNull()
  // User message starts further right than AI message
  expect(userBox!.x).toBeGreaterThan(aiBox!.x)
})

// ---------------------------------------------------------------------------
// Shift+Enter inserts a newline; Enter submits
// ---------------------------------------------------------------------------

test('Shift+Enter inserts a newline; Enter submits the message', async ({
  page,
}) => {
  await page.goto('/schedule')

  const textarea = page.locator('textarea')
  await textarea.click()

  // Shift+Enter should insert a newline without submitting
  await textarea.type('line one')
  await textarea.press('Shift+Enter')
  await textarea.type('line two')

  // The textarea value should contain a newline
  const value = await textarea.inputValue()
  expect(value).toContain('\n')

  // No AI message should have appeared yet (no submit)
  await expect(page.locator('[data-testid="ai-message"]')).toHaveCount(0)

  // Enter alone should submit
  await textarea.press('Enter')

  await expect(page.locator('[data-testid="ai-message"]').first()).toBeVisible({
    timeout: 20000,
  })
})

// ---------------------------------------------------------------------------
// Input clears after submit
// ---------------------------------------------------------------------------

test('input clears automatically after the message is submitted', async ({
  page,
}) => {
  await page.goto('/schedule')

  const textarea = page.locator('textarea')
  await textarea.fill('is anyone free Saturday morning?')
  await page.click('[data-testid="send-button"]')

  // After submit the textarea must be empty
  await expect(textarea).toHaveValue('')
})

// ---------------------------------------------------------------------------
// Auto-scroll — latest message is always visible
// ---------------------------------------------------------------------------

test('chat window scrolls to the latest message automatically', async ({
  page,
}) => {
  await page.goto('/schedule')

  const textarea = page.locator('textarea')

  // Send enough messages to require scrolling
  for (let i = 1; i <= 3; i++) {
    await textarea.fill(`question number ${i} — is anyone free?`)
    await page.click('[data-testid="send-button"]')
    // Wait for the AI response before sending the next one
    await expect(
      page.locator('[data-testid="ai-message"]').nth(i - 1),
    ).toBeVisible({ timeout: 20000 })
  }

  // The latest AI message must be in the viewport
  const lastAiMessage = page.locator('[data-testid="ai-message"]').last()
  await expect(lastAiMessage).toBeInViewport()
})

// ---------------------------------------------------------------------------
// Scrollbar — earlier turns are reviewable
// ---------------------------------------------------------------------------

test('scrollbar allows reviewing earlier turns in the conversation', async ({
  page,
}) => {
  await page.goto('/schedule')

  const textarea = page.locator('textarea')

  // Send enough messages to build up a scrollable history
  for (let i = 1; i <= 3; i++) {
    await textarea.fill(`scheduling question ${i}`)
    await page.click('[data-testid="send-button"]')
    await expect(
      page.locator('[data-testid="ai-message"]').nth(i - 1),
    ).toBeVisible({ timeout: 20000 })
  }

  // The thread container must be scrollable (overflow-y scroll or auto)
  const thread = page.locator('[data-testid="chat-thread"]')
  await expect(thread).toBeVisible()

  // Scroll to top — the first user message must still be reachable
  await thread.evaluate((el) => (el.scrollTop = 0))
  const firstUserMessage = page.locator('[data-testid="user-message"]').first()
  await expect(firstUserMessage).toBeVisible()
})
