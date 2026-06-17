import { test, expect } from './fixtures'

// ---------------------------------------------------------------------------
// Spec 003 - Auth and Family Access E2E tests (RED)
//
// These tests cover the real user flows from the acceptance criteria:
// - Protected route redirect for unauthenticated users
// - Authenticated user can create a family group
// - Organizer can invite members by email
// - Members can view the current member list
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
    await expect(page.getByText('E2E Test User')).toBeVisible()

    // The organizer role should be visible
    await expect(page.getByText(/organizer/i)).toBeVisible()
  })
})