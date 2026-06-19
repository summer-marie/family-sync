import { test as base, expect } from '@playwright/test'
import {
  inviteOrganizerTest,
  inviteRecipientTest,
  inviteAlreadyMemberTest,
} from './fixtures'

// ---------------------------------------------------------------------------
// Spec 007 — Email Invites E2E tests (RED)
//
// Known tokens pre-seeded in global-setup.ts:
//   e2e-valid-invite-token        — PENDING, expires 7 days from now
//   e2e-expired-invite-token      — PENDING, expired 2020-01-01
//   e2e-already-member-invite-token — PENDING, for a user already in a group
//
// The accept page (/invite/[token]) and Members page badges are not yet built;
// all tests here will be RED until Stop 5 implementation is complete.
// ---------------------------------------------------------------------------

const VALID_TOKEN = 'e2e-valid-invite-token'
const EXPIRED_TOKEN = 'e2e-expired-invite-token'
const ALREADY_MEMBER_TOKEN = 'e2e-already-member-invite-token'

// ---------------------------------------------------------------------------
// Test 1: organizer submits invite form → pending invite appears on Members page
// ---------------------------------------------------------------------------

inviteOrganizerTest(
  'organizer submits invite form and pending invite appears on Members page',
  async ({ page }) => {
    await page.goto('/family')

    // The Members page should show the family group the organizer belongs to.
    await expect(page.getByText('E2E Invite Family')).toBeVisible()

    // Fill in the invite form with a new email address.
    await page.getByLabel(/email/i).fill('e2e-new-invite@family-sync.test')
    await page.getByRole('button', { name: /invite/i }).click()

    // After submission the page should show the invite as pending.
    await expect(page.getByText('e2e-new-invite@family-sync.test')).toBeVisible()
    await expect(page.getByText(/pending/i)).toBeVisible()
  },
)

// ---------------------------------------------------------------------------
// Test 2: invited user visits valid accept link → sees confirmation page
// ---------------------------------------------------------------------------

inviteRecipientTest(
  'invited user visits valid accept link and sees confirmation page with family name and Accept button',
  async ({ page }) => {
    await page.goto(`/invite/${VALID_TOKEN}`)

    // Should show the family name and a clear Accept button — not an error.
    await expect(page.getByText('E2E Invite Family')).toBeVisible()
    await expect(page.getByRole('button', { name: /accept/i })).toBeVisible()
  },
)

// ---------------------------------------------------------------------------
// Test 3: invited user clicks Accept → redirected to /schedule
// ---------------------------------------------------------------------------

inviteRecipientTest(
  'invited user clicks Accept and is redirected to /schedule',
  async ({ page }) => {
    await page.goto(`/invite/${VALID_TOKEN}`)

    await page.getByRole('button', { name: /accept/i }).click()

    // After accepting, the user should land on the schedule page.
    await expect(page).toHaveURL(/\/schedule/)
  },
)

// ---------------------------------------------------------------------------
// Test 4: unauthenticated user visits accept link → redirected to sign-in
// ---------------------------------------------------------------------------

base(
  'unauthenticated user visiting accept link is redirected to sign-in with callbackUrl',
  async ({ browser }) => {
    // Fresh context with no stored session = unauthenticated.
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(`/invite/${VALID_TOKEN}`)

    // Should redirect away from the invite page to the sign-in page.
    await expect(page).not.toHaveURL(/\/invite\//)

    // The sign-in redirect should carry a callbackUrl so the user returns
    // to the accept page after authenticating.
    await expect(page).toHaveURL(/callbackUrl.*invite/)

    await context.close()
  },
)

// ---------------------------------------------------------------------------
// Test 5: user visits expired invite link → sees expired error message
// ---------------------------------------------------------------------------

inviteRecipientTest(
  'user visiting expired invite link sees an error message',
  async ({ page }) => {
    await page.goto(`/invite/${EXPIRED_TOKEN}`)

    // Should show a clear error — not an Accept button.
    await expect(page.getByText(/invalid|expired/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /accept/i })).not.toBeVisible()
  },
)

// ---------------------------------------------------------------------------
// Test 6: user already in a group visits accept link → sees already-in-group error
// ---------------------------------------------------------------------------

inviteAlreadyMemberTest(
  'user already in a family group sees an already-in-group error with a link to their schedule',
  async ({ page }) => {
    await page.goto(`/invite/${ALREADY_MEMBER_TOKEN}`)

    // Should show a clear "already a member" message.
    await expect(page.getByText(/already.*member|already.*family/i)).toBeVisible()

    // Should provide a link to the user's existing schedule.
    await expect(page.getByRole('link', { name: /schedule|go to/i })).toBeVisible()
  },
)
