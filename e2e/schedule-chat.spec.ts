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

import { test, expect } from "./fixtures";

test.describe("AI Schedule Chat (Spec 001)", () => {
  test("chat input is visible on the schedule page", async ({ page }) => {
    await page.goto("/schedule");

    const chatInput = page.getByPlaceholder(/ask.*schedule|ask a question/i);
    await expect(chatInput).toBeVisible();
  });

  test("user can submit a question and a response appears", async ({ page }) => {
    await page.goto("/schedule");

    const chatInput = page.getByPlaceholder(/ask.*schedule|ask a question/i);
    await chatInput.fill("Is everyone free Sunday afternoon?");

    await page.getByRole("button", { name: /send|ask/i }).click();

    // A response element must appear within a reasonable timeout.
    // The exact text is non-deterministic (streaming AI), but the container
    // must be present.
    const responseArea = page.getByRole("region", { name: /chat response|assistant/i });
    await expect(responseArea).toBeVisible({ timeout: 15000 });
  });

  test("out-of-scope question shows a safe fallback message instead of a model response", async ({
    page,
  }) => {
    await page.goto("/schedule");

    const chatInput = page.getByPlaceholder(/ask.*schedule|ask a question/i);
    await chatInput.fill("Book a flight to Paris for me");

    await page.getByRole("button", { name: /send|ask/i }).click();

    // The fallback must indicate the question is out of scope.
    // The route returns a JSON message rather than calling the AI model.
    const fallback = page.getByText(/only.*schedule|out of scope|cannot help|scheduling questions/i);
    await expect(fallback).toBeVisible({ timeout: 10000 });
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
