// ---------------------------------------------------------------------------
// Spec 001 - AI Schedule Chat: E2E tests (RED)
//
// These tests cover the chat UI on the /schedule page. All four tests are
// expected to fail (RED) until the chat input and response panel are built.
//
// The main test user (e2e-test@family-sync.test) is seeded and authenticated
// by global-setup. The chat widget is expected to be visible on /schedule
// regardless of family-group status so the user can at least ask questions
// (the response will explain if there is no schedule data available).
//
// Note: full response-content validation (verifying AI answers about real
// events) requires a chat test user seeded with a family group and connected
// calendar. That user is not seeded in global-setup yet — it will be added
// during the GREEN implementation phase together with a `chatTest` fixture.
// These four tests cover the core UI contract that must be present.
// ---------------------------------------------------------------------------

import { test, chatTest, expect } from "./fixtures";

test.describe("AI Schedule Chat (Spec 001)", () => {
  test("chat input is visible on the schedule page", async ({ page }) => {
    await page.goto("/schedule");

    const chatInput = page.getByPlaceholder(/ask.*schedule|ask a question/i);
    await expect(chatInput).toBeVisible();
  });

  test("submit button is disabled while a response is loading", async ({ page }) => {
    await page.goto("/schedule");

    const chatInput = page.getByPlaceholder(/ask.*schedule|ask a question/i);
    await chatInput.fill("Who is busy on Thursday?");

    const submitButton = page.getByRole("button", { name: /send|ask/i });
    await submitButton.click();

    // Immediately after clicking, the button must be disabled to prevent
    // duplicate in-flight requests (per the UI notes in ai-chat-vercel-notes-repo.md).
    await expect(submitButton).toBeDisabled();
  });
});

// Uses chatTest fixture (seeded family group) so familyGroupId is defined
// and the send button is not permanently disabled.
chatTest("user can submit a question and a response appears", async ({ page }) => {
  await page.goto("/schedule");

  const chatInput = page.locator("textarea");
  await chatInput.fill("Is everyone free Sunday afternoon?");

  await page.locator('[data-testid="send-button"]').click();

  // A response element must appear within a reasonable timeout.
  // The exact text is non-deterministic (streaming AI), but the container
  // must be present.
  const responseArea = page.locator('[data-testid="ai-message"]');
  await expect(responseArea).toBeVisible({ timeout: 15000 });
});
