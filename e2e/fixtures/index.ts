import { test as base, expect } from '@playwright/test'
import path from 'path'

// All tests that import from here get a pre-authenticated page — no real
// Google OAuth flow required. The session cookie is seeded by global-setup.ts.
export const test = base.extend({
  page: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(process.cwd(), 'e2e', '.auth', 'user.json'),
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

// Privacy test user — has a CalendarConnection pre-seeded with FULL visibility
// (reset to FULL by global-setup on each run). Used by privacy-controls.spec.ts
// so those tests don't affect the main user's "no connection" state.
export const privacyTest = base.extend({
  page: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(process.cwd(), 'e2e', '.auth', 'privacy-user.json'),
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

// Notes test user — pre-seeded with a family group (E2E Notes Family) by
// global-setup.ts on each run. Used by shared-notes.spec.ts so those tests
// can target the notes area without conflicting with family-access.spec.ts,
// which manages the main test user's family group separately.
export const notesTest = base.extend({
  page: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(process.cwd(), 'e2e', '.auth', 'notes-user.json'),
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

// Chat refactor test user — pre-seeded with a family group (E2E Chat Family)
// and a second member, both without CalendarConnections. Used by
// ai-chat-refactor.spec.ts for multi-turn and schedule-context tests.
export const chatTest = base.extend({
  page: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(process.cwd(), 'e2e', '.auth', 'chat-user.json'),
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

// Invite organizer — pre-seeded with E2E Invite Family and known invite tokens.
export const inviteOrganizerTest = base.extend({
  page: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(process.cwd(), 'e2e', '.auth', 'invite-organizer.json'),
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

// Invite recipient — no family group; visits the valid accept link.
export const inviteRecipientTest = base.extend({
  page: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(process.cwd(), 'e2e', '.auth', 'invite-recipient.json'),
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

// Already-member user — pre-seeded in their own family group; tests the
// already-in-group error path on the accept page.
export const inviteAlreadyMemberTest = base.extend({
  page: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(process.cwd(), 'e2e', '.auth', 'invite-already-member.json'),
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

export { expect }
