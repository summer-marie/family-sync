import { privacyTest as test, expect } from './fixtures'

// ---------------------------------------------------------------------------
// Spec 004 - Privacy Controls E2E tests
//
// Uses the dedicated privacy test user (e2e-privacy@family-sync.test) seeded
// by global-setup with a CalendarConnection reset to FULL visibility each run.
// This keeps the main test user's "no connection" state intact for other specs.
//
// Tests run serial: Test 1 sets BUSY_ONLY; Test 2 verifies it persisted.
//
// Note on full event-filtering coverage: verifying that OTHER family members
// see "Busy" titles requires real Google Calendar events, which are not
// available in E2E without a server-side mock. The two tests here cover:
//   1. The visibility toggle UI exists and saves the setting (Test 1).
//   2. The saved setting persists across page loads and the UI reflects it
//      (Test 2).
// Full event-filtering coverage is exercised by Vitest integration tests
// (src/features/calendar/__tests__/privacy-controls.test.ts).
// ---------------------------------------------------------------------------

test.describe.serial('Privacy controls - visibility settings', () => {
  test('user can toggle event title visibility to BUSY_ONLY from the schedule page', async ({
    page,
  }) => {
    await page.goto('/schedule')

    // The visibility toggle section must be present because the privacy user
    // always has a CalendarConnection seeded by global-setup.
    const toggle = page.getByRole('checkbox', {
      name: /hide my event titles/i,
    })
    await expect(toggle).toBeVisible()

    // Global-setup resets visibility to FULL each run, so the toggle starts
    // unchecked (FULL = titles visible).
    await expect(toggle).not.toBeChecked()

    // Toggle to BUSY_ONLY and save.
    await toggle.click()
    await page.getByRole('button', { name: /save/i }).click()

    // After the server action revalidates, the page re-renders with the new
    // state. The toggle should now be checked.
    await expect(toggle).toBeChecked()

    // A notice should confirm the setting is active.
    await expect(
      page.getByText(/event titles are hidden/i),
    ).toBeVisible()
  })

  test('schedule page reflects BUSY_ONLY visibility setting after a page reload', async ({
    page,
  }) => {
    // Navigate to /schedule fresh — verifies the BUSY_ONLY setting set in
    // Test 1 was persisted to the database, not just held in component state.
    await page.goto('/schedule')

    const toggle = page.getByRole('checkbox', {
      name: /hide my event titles/i,
    })
    await expect(toggle).toBeVisible()

    // Toggle must still be checked — the server action in Test 1 persisted it.
    await expect(toggle).toBeChecked()

    // The hidden-titles notice must still be visible.
    await expect(
      page.getByText(/event titles are hidden/i),
    ).toBeVisible()
  })
})
