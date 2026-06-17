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

export { expect }
