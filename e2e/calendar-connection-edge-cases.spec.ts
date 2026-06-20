import { calendarErrorTest as test, expect } from './fixtures'

// Spec 002 - Calendar Connection E2E Edge Cases
//
// Additional E2E coverage for the calendar-connection feature.
//
// - Expired token error state shows a user-facing error (not a crash)
//   This test uses a pre-seeded user whose CalendarConnection is in ERROR
//   status (see global-setup.ts). Because the schedule page reads Google
//   Calendar server-side — which Playwright route interception cannot reach
//   — the ERROR connection state is the realistic MVP seam for verifying
//   the user-facing error contract: a clear notice that the connection
//   expired plus a reconnect CTA, with no unhandled error boundary.
//
// - Reconnecting does not create duplicate connection records (still RED)
// - Overlap indicator rendering (still RED)
//
// The latter two remain placeholder tests documenting desired behavior for
// features not yet built. They are left failing intentionally so the tracking
// doc reflects real status.

test.describe('Calendar connection - edge cases', () => {
  test('expired token shows user-facing error (not crash)', async ({ page }) => {
    // The calendar-error test user is pre-seeded with a CalendarConnection
    // in ERROR status. The schedule page must:
    // 1. Not crash or show an unhandled error boundary
    // 2. Display a clear error message mentioning the expired connection
    // 3. Offer a reconnect button/CTA
    await page.goto('/schedule')

    // User-facing error notice about the expired connection. Match the
    // title line specifically to avoid a strict-mode violation against the
    // descriptive body line ("Reconnect to share...") which also matches.
    await expect(
      page.getByText(/your google calendar connection expired/i),
    ).toBeVisible()

    // A reconnect CTA must be present.
    await expect(
      page.getByRole('button', { name: /connect|reconnect/i }),
    ).toBeVisible()

    // Must not surface an unhandled error boundary.
    await expect(
      page.getByRole('heading', { name: /something went wrong/i }),
    ).not.toBeVisible()
  })

  test('reconnecting does not create duplicate connection records', async ({ page }) => {
    // 1. Navigate to schedule, which shows connection status
    // 2. Mock a scenario where the user clicks "Reconnect" (OAuth re-authorization)
    // 3. Verify that only one CalendarConnection row exists in the DB
    //
    // Without the reconnect UI, this test documents the idempotency
    // requirement: multiple reconnect calls should not create multiple
    // connections for the same user/provider.
    //
    // Implementation would either use Playwright route interception for
    // the reconnect API endpoint or seed an ERROR state in the DB and
    // observe the post-reconnect state.

    await page.goto('/schedule')

    // Placeholder - update once reconnect UI exists:
    // const connectButton = page.getByRole('button', { name: /reconnect/i })
    // await connectButton.click()
    // await expect(page.getByText(/connection.*successful/i)).toBeVisible()

    // Temporary expectation - will fail until reconnect flow exists:
    expect(true).toBe(false)
  })

  test('overlap indicator renders when multiple members have busy slots', async ({ page }) => {
    // This test requires seeding multiple family members with overlapping
    // busy events in Google Calendar, then verifying the UI shows an
    // overlap indicator (e.g. a visual badge, color, or text).
    //
    // The schedule page currently renders per-member event lists but
    // does not have an overlap indicator component. This RED test asserts
    // the desired UX: when 2+ members are busy at the same time, the UI
    // should make that visible at a glance (not just by parsing each member's
    // individual event list).

    // Setup would require:
    // 1. Multiple seeded family members in global-setup
    // 2. Mocked Google Calendar responses with overlapping events
    //    (e.g. Member A: 9am-10am, Member B: 9:30am-10:30am)
    // 3. Verify an overlap indicator appears (e.g. "2 members busy 9:30-10:00")

    await page.goto('/schedule')

    // Placeholder - update once overlap UI exists:
    // await expect(page.getByText(/2.*members.*busy/i)).toBeVisible()
    // or: await expect(page.locator('[data-testid="overlap-indicator"]')).toBeVisible()

    // Temporary expectation - will fail until overlap UI exists:
    expect(true).toBe(false)
  })
})