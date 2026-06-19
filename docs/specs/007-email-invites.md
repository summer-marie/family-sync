# Spec 007 — Email Invites via Resend

## Overview

Currently the invite flow creates an `Invite` row in the database but sends nothing to the invited person. The organizer has no way to notify a family member that they've been invited. This spec adds real email delivery via Resend — the organizer enters an email, the invited person receives a link, clicks it, signs in with Google, and is added to the family group.

---

## Goals

- Invited person receives an email with a secure accept link
- Clicking the link sends them to Google sign-in if not authenticated
- After sign-in they land on a confirmation page and click Accept
- Accepting adds them to the family group and marks the invite ACCEPTED
- If they are already in a different family group, they see an error with a link to their existing group
- Invite tokens expire after 7 days
- The Members page reflects invite status (PENDING / ACCEPTED)

---

## Out of Scope

- Styled HTML email templates (plain text only for MVP)
- REVOKED status or organizer cancellation of invites
- Resending invites
- Multi-family-group membership
- Email delivery failure retries (log the error, do not crash the invite creation)

---

## Domain and Environment Notes

### Google OAuth redirect URIs
Once the app is deployed to a real domain, keep `http://localhost:3000/api/auth/callback/google` listed as an authorized redirect URI in Google Cloud Console alongside the production URL. This is required for local dev to continue working after go-live. Do this at the time of first production deploy.

### Resend domain verification
Resend requires a verified sender domain to deliver to real email addresses. During local development, Resend's test mode sends emails to the Resend dashboard instead of real inboxes — no domain required for dev testing.

**Action required before production deploy:** register a domain and verify it in Resend. Add the DNS records Resend provides. Until then, use Resend test mode for all local and staging testing.

### Environment variables needed
```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=invite@yourdomain.com
NEXTAUTH_URL=https://yourdomain.com  # update for production
```

Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to `.env.local` for development and to Vercel environment variables for production.

---

## Architecture Changes

### 1. Schema — add token and status to Invite

Add a `status` enum and a unique `token` field to the `Invite` model.

```prisma
enum InviteStatus {
  PENDING
  ACCEPTED
}

model Invite {
  id            String       @id @default(cuid())
  familyGroupId String
  email         String
  role          Role         @default(MEMBER)
  token         String       @unique @default(cuid())
  status        InviteStatus @default(PENDING)
  createdAt     DateTime     @default(now())
  expiresAt     DateTime

  familyGroup FamilyGroup @relation(fields: [familyGroupId], references: [id], onDelete: Cascade)

  @@unique([familyGroupId, email])
  @@map("invite")
}
```

This is a **protected area change** — migration must be applied before any other work begins.

### 2. Resend client

`src/lib/resend.ts` — instantiate and export the Resend client. Read `RESEND_API_KEY` from environment. Throw a clear error at startup if the key is missing so misconfiguration is caught early.

### 3. Email sending function

`src/lib/email/send-invite-email.ts` — accepts `{ to, inviterName, familyName, acceptUrl }` and sends a plain-text invite email via Resend.

Email content (plain text):
```
Hi,

{inviterName} has invited you to join the {familyName} family on Family Sync.

Click the link below to accept:
{acceptUrl}

This link expires in 7 days.

If you did not expect this invitation, you can ignore this email.
```

The `acceptUrl` is `${NEXTAUTH_URL}/invite/${token}`.

### 4. Update inviteMember service

`src/features/family/services.ts` — after creating the `Invite` row, call `sendInviteEmail`. If the email send fails, log the error but do not throw — the invite record is still created and the organizer can share the link manually if needed.

Pass `inviterName` (from the session user's name or email) and `familyName` (from the family group record) into `sendInviteEmail`.

### 5. Accept invite page

`src/app/invite/[token]/page.tsx` — server component that handles three states:

1. **Not authenticated** — redirect to Google sign-in with a `callbackUrl` pointing back to this page
2. **Token invalid or expired** — show an error: "This invite link is invalid or has expired."
3. **Already in a different family group** — show an error: "You are already a member of a family group." with a link to `/schedule`
4. **Valid token, authenticated, no existing group** — show the family group name, the inviter's name, and an Accept button

The Accept button submits to a server action that:
- Validates the token again (re-check expiry and status)
- Creates a `GroupMembership` record
- Sets the invite `status` to `ACCEPTED`
- Redirects to `/schedule`

### 6. Members page — show invite status

`src/app/family/page.tsx` — the Pending Invites section already exists. Update it to display `PENDING` or `ACCEPTED` badge per invite. Filter to only show `PENDING` invites in the pending section — accepted members already appear in the Members list.

---

## File Changes

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `InviteStatus` enum, `token` and `status` fields to `Invite` |
| Migration | New migration for token + status fields |
| `src/lib/resend.ts` | New — Resend client setup |
| `src/lib/email/send-invite-email.ts` | New — plain-text invite email sender |
| `src/features/family/services.ts` | Call `sendInviteEmail` after invite creation |
| `src/features/family/actions.ts` | Pass inviter name and family name into service |
| `src/app/invite/[token]/page.tsx` | New — accept invite page (4 states) |
| `src/app/invite/[token]/actions.ts` | New — acceptInviteAction server action |
| `src/app/family/page.tsx` | Filter pending invites; show status badges |

---

## Resend Setup

Install the Resend SDK:
```powershell
npm install resend
```

Create a Resend account at resend.com. For local development, use the test API key from the Resend dashboard — emails appear in the dashboard logs, not in real inboxes. For production, verify your domain and use the live API key.

`src/lib/resend.ts`:
```ts
import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set");
}

export const resend = new Resend(process.env.RESEND_API_KEY);
```

The `send-invite-email.ts` function calls `resend.emails.send(...)` with `from`, `to`, `subject`, and `text` fields. No HTML template needed for MVP.

---

## TDD Stop Points and Commit Sequence

Follow this exact sequence. Do not skip stops. Each stop is a commit. After every RED and GREEN run, save the log to `docs/tdd/logs/` using the filename listed at each stop and update `docs/tdd/logs/test-tracking.md` with a new entry following the same format as prior steps.

### Stop 1 — Schema migration (no tests)
- Add `InviteStatus` enum, `token`, and `status` to `Invite` model
- Run migration
- Verify Prisma client regenerates without errors
- **Commit:** `chore: add invite token and status fields to schema`

### Stop 2 — Write failing unit and integration tests (RED)

Tests to write before touching any implementation:

**`src/features/family/__tests__/invite-email.test.ts`**
- `inviteMember` generates a unique token on each invite
- `inviteMember` calls `sendInviteEmail` with correct `to`, `familyName`, `inviterName`, and `acceptUrl`
- `inviteMember` does not throw if `sendInviteEmail` fails — invite record still created
- duplicate invite for same email+group is still rejected

**`src/lib/email/__tests__/send-invite-email.test.ts`**
- calls `resend.emails.send` with correct `from`, `to`, `subject`, and `text`
- `text` contains the accept URL
- `text` contains the inviter name and family name
- `text` contains expiry notice

**`src/app/invite/__tests__/accept-invite.test.ts`**
- valid token + authenticated user with no group → membership created, invite marked ACCEPTED
- expired token → returns error state
- invalid token → returns error state
- user already in a group → returns already-in-group error state
- already ACCEPTED token → returns error state (cannot accept twice)

Capture RED log:
```powershell
npx vitest run src/features/family/__tests__/invite-email.test.ts src/lib/email/__tests__/send-invite-email.test.ts src/app/invite/__tests__/accept-invite.test.ts 2>&1 | Tee-Object -FilePath docs/tdd/logs/15-email-invites-red.txt
```

**Commit:** `test: red — email invite service and accept flow tests`

### Stop 3 — Implement to green (GREEN)
- Create `src/lib/resend.ts`
- Create `src/lib/email/send-invite-email.ts`
- Update `inviteMember` in services to generate token and call send
- Create `acceptInviteAction` server action
- Run suite and confirm green

Capture GREEN log:
```powershell
npx vitest run src/features/family/__tests__/invite-email.test.ts src/lib/email/__tests__/send-invite-email.test.ts src/app/invite/__tests__/accept-invite.test.ts 2>&1 | Tee-Object -FilePath docs/tdd/logs/15-email-invites-green.txt
```

**Commit:** `feat: email invite sending and accept flow`

### Stop 4 — Write failing Playwright E2E tests (RED)

File: `e2e/email-invites.spec.ts`

Tests:
- organizer submits invite form → pending invite appears on Members page
- invited user visits valid accept link → sees confirmation page with family name and Accept button
- invited user clicks Accept → redirected to `/schedule`, appears in Members list
- unauthenticated user visits accept link → redirected to Google sign-in, lands back on accept page after auth
- user visits expired invite link → sees expired error message
- user already in a group visits accept link → sees already-in-group error with link to `/schedule`

Capture RED log:
```powershell
npx playwright test e2e/email-invites.spec.ts 2>&1 | Tee-Object -FilePath docs/tdd/logs/15-email-invites-e2e-red.txt
```

**Commit:** `test: red — E2E tests for email invite flow`

### Stop 5 — Implement UI to green (GREEN)
- Create `src/app/invite/[token]/page.tsx` with all four states
- Update `src/app/family/page.tsx` to filter pending invites and show status badges
- Seed a second E2E test user in `e2e/global-setup.ts` to act as the invited person
- Run Playwright and confirm green

Capture GREEN log:
```powershell
npx playwright test e2e/email-invites.spec.ts 2>&1 | Tee-Object -FilePath docs/tdd/logs/15-email-invites-e2e-green.txt
```

**Commit:** `feat: accept invite page and members page status badges`

---

## Edge Cases to Cover in Tests

| Edge Case | Where to Test |
|-----------|---------------|
| Token already ACCEPTED — cannot accept twice | Vitest integration |
| Token expired | Vitest integration + Playwright E2E |
| Token does not exist | Vitest integration + Playwright E2E |
| User already in a different family group | Vitest integration + Playwright E2E |
| Resend API call fails — invite still created | Vitest integration |
| Duplicate invite for same email + group | Vitest integration (existing behavior, verify still works) |
| Unauthenticated user on accept page | Playwright E2E |
| Invite for email that doesn't match signed-in user's email | Vitest integration — should this be enforced or ignored for MVP? Note: if enforced, add a check in `acceptInviteAction` |

**Note on email mismatch:** the current schema invites by email but membership is tied to `userId`. If someone accepts an invite meant for a different email address, they get added to the group. For MVP this is acceptable — flag it as a known gap to address post-demo if needed.

---

## Risks

- **Resend domain verification** must be completed before production deploy. Without it, emails only appear in the Resend dashboard. Make a note in your deploy checklist.
- **Google OAuth redirect URIs** — add `http://localhost:3000/api/auth/callback/google` alongside the production URL so local dev keeps working after go-live.
- **Schema migration** is a protected area change — verify the migration applies cleanly before writing any tests.
- **Email mismatch** — see edge case table above.

---

## Done Criteria

- [ ] `Invite` model has `token` and `status` fields, migration applied
- [ ] Organizer submits invite → email arrives with a working accept link
- [ ] Accept link redirects unauthenticated users to Google sign-in then back
- [ ] Accept page shows confirmation with family name and inviter name
- [ ] Accepting adds the user to the family group and marks invite ACCEPTED
- [ ] Expired and invalid tokens show clear error messages
- [ ] Already-in-group users see an error with a link to their schedule
- [ ] Members page shows PENDING status for outstanding invites
- [ ] All 5 TDD stop commits exist in git history in order
- [ ] All edge cases in the table above have a corresponding test
- [ ] Resend setup notes are followed and API key is in `.env.local`
