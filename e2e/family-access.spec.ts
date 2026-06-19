import { test, expect } from './fixtures'

// ---------------------------------------------------------------------------
// Spec 003 - Auth and Family Access E2E tests (RED)
//
// These tests cover the real user flows from the acceptance criteria:
// - Protected route redirect for unauthenticated users
// - Authenticated user can create a family group
// - Organizer can invite members by email
// - Members can view the current member list
// - Cross-group access restriction: a user cannot view another family's schedule
//
// All tests use the pre-authenticated fixture from global-setup, except the
// unauthenticated redirect test which creates a fresh context.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Protected route - unauthenticated users redirected away from /family
// ---------------------------------------------------------------------------

test.describe('Protected route - unauthenticated access', () => {
  test('redirects unauthenticated user away from /family', async ({ browser }) => {
    // Fresh context with no storage state = not authenticated
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto('/family')

    // Should be redirected away from the protected family page
    await expect(page).not.toHaveURL(/\/family/)

    await context.close()
  })
})

// ---------------------------------------------------------------------------
// Family group management (serial: create -> invite -> view members)
// These tests depend on each other, so they must run in order.
// ---------------------------------------------------------------------------

test.describe.serial('Family group management', () => {
  test('authenticated user can create a family group', async ({ page }) => {
    await page.goto('/family')

    // User without a group should see a creation prompt or form
    await expect(
      page.getByRole('heading', { name: /create.*family|family.*setup|get started|set up/i }),
    ).toBeVisible()

    // Fill in the family group name
    await page.getByLabel(/family.*name|group.*name/i).fill('E2E Test Family')

    // Submit the creation form
    await page.getByRole('button', { name: /create|get started|set up/i }).click()

    // The group name should now be visible on the page
    await expect(page.getByText('E2E Test Family')).toBeVisible()
  })

  test('organizer can invite a member by email', async ({ page }) => {
    await page.goto('/family')

    // Fill in the invite form with a valid email
    await page.getByPlaceholder(/email|invite/i).fill('invited-member@example.com')

    // Submit the invite
    await page.getByRole('button', { name: /invite|send invite/i }).click()

    // The invited email should appear on the page as a pending invite
    await expect(page.getByText('invited-member@example.com')).toBeVisible()
  })

  test('members can view the current member list', async ({ page }) => {
    await page.goto('/family')

    // A members section should be visible
    await expect(page.getByRole('heading', { name: /members/i })).toBeVisible()

    // The organizer (E2E Test User from global-setup) should be listed
    await expect(page.getByRole('main').getByText('E2E Test User')).toBeVisible()

    // The organizer role should be visible
    await expect(page.getByText(/organizer/i)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Cross-group access restriction (RED)
//
// A user who is not a member of a family group must not be able to view that
// group's schedule. The service layer (getFamilySchedule) already enforces
// this fail-closed rule, but an E2E test verifies the full request/response
// path: unauthenticated/unauthorized requests result in a 403 or redirect.
//
// Implementation note: This test documents the desired behavior. Making it
// pass requires either:
// 1. Seeding a second family/user in global-setup and visiting their /schedule
// 2. Intercepting the API route to simulate a cross-group request
// ---------------------------------------------------------------------------

test.describe('Cross-group access restriction', () => {
  test('user cannot view another family group schedule', async ({ page, browser }) => {
    // Setup: A fresh context representing a user who is NOT a member of the
    // E2E Test Family. In a real implementation, global-setup would seed
    // a second family/group and this test would navigate to that schedule.
    //
    // For now, the schedule page does not exist, so this test is expected to
    // fail (RED) until the route exists.

    await page.goto('/schedule')

    // Expected behavior: If the user is not a member of the requested family,
    // the route should return 403 or redirect (not expose schedule data).
    //
    // Placeholder assertion - update once schedule route exists:
    // await expect(page).toHaveURL(/403|forbidden|not.*member/i)

    // Temporary expectation - will fail until schedule route exists:
    expect(true).toBe(false)
  })

  test('member list updates after adding a new member', async ({ page }) => {
    // After inviting a member (covered by the serial flow above), the members
    // list should refresh to show the new pending/active member. This tests
    // that the UI reacts to data changes rather than requiring a full reload.

    await page.goto('/family')

    // Expected: The invited member should appear in the members section
    // Placeholder - update once invite flow exists:
    // await expect(page.getByText('invited-member@example.com')).toBeVisible()

    // Temporary expectation - will fail until invite flow exists:
    expect(true).toBe(false)
  })
})