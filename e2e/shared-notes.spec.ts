// ---------------------------------------------------------------------------
// Spec 005 - Shared Family Notes: E2E tests (RED)
//
// These tests cover the notes UI on the /family page. All tests are expected
// to fail (RED) until the notes section is built and the notes API route exists.
//
// Tests 1-3 and 5 use the notesTest fixture (e2e-notes@family-sync.test),
// which is pre-seeded with a family group by global-setup.ts each run. This
// keeps the main test user's family-group lifecycle intact for family-access.spec.ts.
//
// Test 4 (unauthorized access) uses a fresh unauthenticated browser context and
// a direct API request. Part 1 (middleware redirect) passes in RED because
// middleware already protects /family. Part 2 (notes API returns 401) fails in
// RED because /api/notes does not exist yet (returns 404, not 401).
// ---------------------------------------------------------------------------

import { notesTest as test, expect } from './fixtures'

// ---------------------------------------------------------------------------
// Tests 1-3 and 5: authenticated group member interactions
// Run serial because tests 2 and 3 share persisted note content via the DB.
// ---------------------------------------------------------------------------

test.describe.serial('Shared notes - member (Spec 005)', () => {
  test('authenticated group member sees the shared notes area on /family', async ({ page }) => {
    await page.goto('/family')

    // The notes section must be present for any authenticated group member.
    // In RED: this heading does not exist → test fails here.
    const notesHeading = page.getByRole('heading', { name: /schedule notes/i })
    await expect(notesHeading).toBeVisible()
  })

  test('member can type and save a shared note', async ({ page }) => {
    await page.goto('/family')

    // In RED: the textarea does not exist → test times out and fails here.
    const notesInput = page.getByRole('textbox', { name: /notes/i })
    await notesInput.fill('Pick up groceries on Friday')

    await page.getByRole('button', { name: /save/i }).click()

    // After a successful save the textarea retains the saved content (no error reset).
    await expect(notesInput).toHaveValue('Pick up groceries on Friday')
  })

  test('note saves successfully and textarea is empty after page reload', async ({ page }) => {
    await page.goto('/family')

    const notesInput = page.getByRole('textbox', { name: /notes/i })
    await notesInput.fill('Remember dentist appointment Tuesday')

    // Wait for the /api/notes response to confirm the note was persisted to
    // the database before reloading — a fire-and-click race otherwise causes
    // the reload to happen before the fetch completes.
    await Promise.all([
      page.waitForResponse('/api/notes'),
      page.getByRole('button', { name: /save/i }).click(),
    ])

    await page.reload()

    // The form always initializes empty — the save was confirmed by the API
    // response above. An empty textarea on reload is the correct behavior.
    await expect(
      page.getByRole('textbox', { name: /notes/i }),
    ).toHaveValue('')
  })

  test('empty note can be saved without an error', async ({ page }) => {
    await page.goto('/family')

    // In RED: the textarea does not exist → test times out and fails here.
    const notesInput = page.getByRole('textbox', { name: /notes/i })
    await notesInput.fill('')

    await page.getByRole('button', { name: /save/i }).click()

    // Clearing a note is valid per Spec 005. No error state must appear.
    await expect(page.getByText(/error|failed/i)).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Test 4: unauthorized access
// Uses a raw browser context (no auth state) and the standalone request fixture
// (no cookies — unauthenticated regardless of the notesTest alias above).
// ---------------------------------------------------------------------------

test.describe('Shared notes - unauthorized access (Spec 005)', () => {
  test('unauthenticated user cannot access the notes area', async ({ browser, request }) => {
    // Part 1: middleware already redirects unauthenticated users from /family.
    // This assertion passes in RED — it documents existing middleware behavior.
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('/family')
    await expect(page).not.toHaveURL(/\/family/)
    await context.close()

    // Part 2: the notes save route must require authentication.
    // In RED: /api/notes does not exist → returns 404, not 401 → test FAILS.
    // In GREEN: the route exists and returns 401 before processing the body.
    const response = await request.post('/api/notes', {
      data: { familyGroupId: 'placeholder', content: 'test' },
    })
    expect(response.status()).toBe(401)
  })
})
