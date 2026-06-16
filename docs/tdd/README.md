# TDD Progress Tracking

This folder documents the local, non-committing TDD loop used across the project.
The convention itself is version-controlled; the captured output files are local
only and excluded by `.gitignore`.

## Two test layers, two roles

| Layer   | Tool       | RED phase            | Screenshots? |
| ------- | ---------- | -------------------- | ------------ |
| Unit/Integration | Vitest     | `NN-name-red.txt` log | No (jsdom has no real browser) |
| End-to-end       | Playwright | HTML report + failure screenshots | Yes |

Vitest owns the RED log file. Playwright owns the visual progress dashboard and
failure screenshots. Neither tool performs any git operation; commits are owned
manually.

## Per-module RED loop

For each module or feature:

1. Write the failing test first (Vitest for logic, Playwright for UI flows).
2. Run the suite with output redirected to a numbered log file.
3. Open the log and confirm the test fails for the RIGHT reason (the behavior
   does not exist yet), not for an unrelated setup, import, or type error.
4. Implement the minimum code to pass.
5. Re-run and capture the GREEN output if desired (`NN-name-green.txt`).
6. Refactor only after GREEN.

### Vitest RED capture (PowerShell)

Number the file to keep modules in implementation order. Two digits is enough
for the MVP feature set.

```powershell
npx vitest run src/features/schedule-chat 2>&1 | Tee-Object -FilePath docs/tdd/logs/01-schedule-chat-red.txt
```

- `vitest run` exits after one run instead of watching.
- `2>&1` merges stderr (where Vitest prints failures) into stdout.
- `Tee-Object` writes the stream to the file AND shows it in the terminal.
- Always include `2>&1`; without it, Vitest failure output may not reach the file.

Confirm the failure reason before moving on. A RED log is only useful if the
test is failing because the feature is absent, not because of a typo, bad import,
or wrong path. Look for the assertion message that describes the missing
behavior.

### Vitest RED capture (cmd.exe)

```cmd
npx vitest run src/features/schedule-chat > docs/tdd/logs/01-schedule-chat-red.txt 2>&1
```

### Playwright RED capture (PowerShell)

```powershell
npx playwright test e2e/schedule-chat.spec.ts 2>&1 | Tee-Object -FilePath docs/tdd/logs/01-schedule-chat-e2e-red.txt
```

## Tracking progress without committing

The local log files live under `docs/tdd/logs/` and are gitignored. Use them as
scratch evidence while iterating on a module.

For a durable, reviewable progress view, use the Playwright HTML report:

```powershell
npx playwright test
npx playwright show-report
```

The HTML report shows pass/fail counts, timings, and for any failing E2E test a
captured screenshot plus a trace. This is the primary visual progress dashboard
and does not require any commit.

## Failure screenshots (Playwright only)

`playwright.config.ts` sets:

- `screenshot: 'only-on-failure'` captures a PNG when an E2E test fails.
- `trace: 'retain-on-failure'` keeps a trace for failed tests.

These artifacts land in `test-results/` (also gitignored) and are embedded in the
HTML report, so you can review the failing UI state directly from the report.

Vitest runs in jsdom and has no real browser surface, so it cannot produce
meaningful screenshots. For UI behavior that must be visible at failure time,
cover it with a Playwright E2E test rather than a Vitest test.

## Manual screenshot inside an E2E test

For targeted captures beyond auto-failure screenshots, use Playwright's locator
screenshot inside a test:

```typescript
import { test, expect } from './fixtures'

test('schedule view renders privacy-safe blocks', async ({ page }) => {
  await page.goto('/schedule')
  await expect(page.getByRole('heading', { name: /family schedule/i })).toBeVisible()
  // Explicit capture, useful for documenting expected RED states by hand
  await page.screenshot({ path: 'docs/tdd/logs/01-schedule-view.png', fullPage: true })
})
```
