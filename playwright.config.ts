import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    // Capture a screenshot automatically when an E2E test fails so the
    // failure state is reviewable from the HTML report and test-results/.
    screenshot: 'only-on-failure',
    // Keep a trace for failed tests to make post-run debugging easier.
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    // Reuse an already-running dev server locally; always start fresh in CI
    reuseExistingServer: !process.env.CI,
  },
})
