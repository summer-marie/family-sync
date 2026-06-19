import { test, expect } from './fixtures'

// ---------------------------------------------------------------------------
// Spec 002 - Calendar Connection E2E tests (RED)
//
// These tests cover the real user flows from the acceptance criteria in
// docs/specs/002-calendar-connection.md:
// - Authenticated user can reach the schedule page
// - User without a connection sees a prompt to connect their Google Calendar
// - Schedule view renders family members' availability
// - A member with no connection degrades to an unavailable state rather than
//   breaking the page
//
// The route /schedule does not exist yet, so every test here fails. That is
// the correct RED reason: behavior is absent, not a typo or bad path.
//
// All tests use the pre-authenticated fixture from global-setup, so no real
// Google OAuth flow is required.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Schedule page - access and structure
// ---------------------------------------------------------------------------

test.describe('Schedule page - access', () => {
  test('authenticated user can reach the schedule page without redirect', async ({ page }) => {
    await page.goto('/schedule')

    // Must not be kicked to sign-in or an error page
    await expect(page).not.toHaveURL(/sign-in|login|error/)

    // Page must have a visible heading identifying it as a schedule view.
    // level: 1 avoids matching the ChatWidget's "Ask about the schedule" h2.
    await expect(
      page.getByRole('heading', { name: /family schedule/i, level: 1 }),
    ).toBeVisible()
  })

  test('unauthenticated user is redirected away from the schedule page', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto('/schedule')

    await expect(page).not.toHaveURL(/\/schedule/)

    await context.close()
  })
})

// ---------------------------------------------------------------------------
// Calendar connection prompt
// ---------------------------------------------------------------------------

test.describe('Calendar connection - connect prompt', () => {
  test('user without a connected calendar sees a prompt to connect', async ({ page }) => {
    await page.goto('/schedule')

    // The test user has no real Google Calendar connected, so the UI must
    // show a connect action. Accept either a button or a link.
    await expect(
      page
        .getByRole('button', { name: /connect.*calendar|connect.*google/i })
        .or(page.getByRole('link', { name: /connect.*calendar|connect.*google/i })),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Shared schedule view
// ---------------------------------------------------------------------------

test.describe('Shared schedule view', () => {
  test('schedule view renders a section for family members', async ({ page }) => {
    await page.goto('/schedule')

    // The Family schedule section must be visible as a landmark region.
    await expect(
      page.getByRole('region', { name: /family schedule/i }),
    ).toBeVisible()
  })

  test('schedule view degrades gracefully when a member has no calendar connection', async ({
    page,
  }) => {
    await page.goto('/schedule')

    // The test user has no real calendar connected, so the schedule view
    // must show an unavailable indicator rather than crashing or showing
    // an empty white block with no explanation.
    await expect(
      page.getByText(/unavailable|not connected|no calendar connected/i),
    ).toBeVisible()
  })

  test('schedule view does not crash or show a full error page when no member is connected', async ({
    page,
  }) => {
    await page.goto('/schedule')

    // The page must remain functional: no unhandled error boundary, no
    // "Something went wrong" fallback covering the whole page.
    await expect(page.getByRole('heading', { name: /something went wrong|error/i })).not.toBeVisible()

    // The main schedule heading must still be visible.
    await expect(
      page.getByRole('heading', { name: /schedule|family calendar|availability/i }),
    ).toBeVisible()
  })
})
