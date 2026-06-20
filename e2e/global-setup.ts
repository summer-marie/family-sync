import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

// Load env vars the same way Next.js does: .env.local takes priority over .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const TEST_USER_EMAIL = 'e2e-test@family-sync.test'
const TEST_USER_NAME = 'E2E Test User'

// Separate user for privacy-controls E2E tests. This user always has a
// CalendarConnection seeded (reset to FULL on each run) so the visibility
// toggle is visible from the first test without affecting the main test user,
// whose tests rely on having no connection seeded.
const PRIVACY_TEST_USER_EMAIL = 'e2e-privacy@family-sync.test'
const PRIVACY_TEST_USER_NAME = 'E2E Privacy User'

// Invite flow test users (Spec 007).
// - organizer: pre-seeded with a family group and known invite tokens
// - recipient: no family group; visits the valid accept link
// - already-member: pre-seeded in their own family group; tests the
//   already-in-group error path
const INVITE_ORGANIZER_EMAIL = 'e2e-invite-organizer@family-sync.test'
const INVITE_ORGANIZER_NAME = 'E2E Invite Organizer'
const INVITE_RECIPIENT_EMAIL = 'e2e-invite-recipient@family-sync.test'
const INVITE_RECIPIENT_NAME = 'E2E Invite Recipient'
const INVITE_ALREADY_MEMBER_EMAIL = 'e2e-invite-already-member@family-sync.test'
// Avoid the literal words "Already Member" in the display name: email-invites
// spec :120 asserts getByText(/already.*member|already.*family/i) which would
// otherwise also match this user's name in the nav sidebar, causing a strict-
// mode violation against the h1/p on the accept page.
const INVITE_ALREADY_MEMBER_NAME = 'E2E In-Group User'

// Known tokens pre-seeded so E2E tests can navigate directly to accept URLs.
const INVITE_TOKEN_VALID = 'e2e-valid-invite-token'
const INVITE_TOKEN_EXPIRED = 'e2e-expired-invite-token'
const INVITE_TOKEN_ALREADY_MEMBER = 'e2e-already-member-invite-token'

const AUTH_DIR = path.join(process.cwd(), 'e2e', '.auth')

async function globalSetup() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  })

  try {
    // -----------------------------------------------------------------------
    // Main test user (e2e-test@family-sync.test)
    // No CalendarConnection seeded — calendar-connection E2E tests rely on
    // the "no connection" state to test the connect prompt and unavailable UI.
    // -----------------------------------------------------------------------
    const user = await prisma.user.upsert({
      where: { email: TEST_USER_EMAIL },
      update: {},
      create: { email: TEST_USER_EMAIL, name: TEST_USER_NAME },
    })

    // Clean up any existing family group for the test user so the create
    // test works on every run. Cascades to memberships and invites.
    await prisma.familyGroup.deleteMany({
      where: { memberships: { some: { userId: user.id } } },
    })

    // Replace any stale sessions for this test user
    await prisma.session.deleteMany({ where: { userId: user.id } })

    const sessionToken = randomUUID()
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await prisma.session.create({
      data: { sessionToken, userId: user.id, expires },
    })

    // Write the Playwright storage-state file that fixtures will load
    fs.mkdirSync(AUTH_DIR, { recursive: true })
    fs.writeFileSync(
      path.join(AUTH_DIR, 'user.json'),
      JSON.stringify(buildStorageState(sessionToken, expires), null, 2),
    )

    console.log(`[global-setup] seeded test user: ${user.email}`)
    console.log('[global-setup] auth state written to e2e/.auth/user.json')

    // -----------------------------------------------------------------------
    // Foreign family group (deterministic ID) for cross-group access tests.
    // The main test user is NOT a member of this group. The chat route's
    // getFamilySchedule must reject requests targeting this ID with a 403.
    // A separate "foreign owner" user is the sole member so the group is
    // realistic and not orphaned.
    // -----------------------------------------------------------------------
    const FOREIGN_FAMILY_ID = 'foreign-family-e2e-deterministic-id'
    const foreignOwner = await prisma.user.upsert({
      where: { email: 'e2e-foreign-owner@family-sync.test' },
      update: {},
      create: { email: 'e2e-foreign-owner@family-sync.test', name: 'E2E Foreign Owner' },
    })

    // deleteMany is idempotent whether or not the row exists.
    await prisma.familyGroup.deleteMany({ where: { id: FOREIGN_FAMILY_ID } })
    await prisma.familyGroup.create({
      data: {
        id: FOREIGN_FAMILY_ID,
        name: 'E2E Foreign Family',
        memberships: { create: { userId: foreignOwner.id, role: 'ORGANIZER' } },
      },
    })

    console.log('[global-setup] seeded foreign family group for cross-group access tests')

    // -----------------------------------------------------------------------
    // Privacy test user (e2e-privacy@family-sync.test)
    // Always has a CalendarConnection with visibility FULL (reset each run)
    // so the visibility toggle is visible from the start of privacy E2E tests.
    // No family group seeded — privacy tests operate in the solo schedule view.
    // -----------------------------------------------------------------------
    const privacyUser = await prisma.user.upsert({
      where: { email: PRIVACY_TEST_USER_EMAIL },
      update: {},
      create: { email: PRIVACY_TEST_USER_EMAIL, name: PRIVACY_TEST_USER_NAME },
    })

    // Reset visibility to FULL on every run so Test 1 always starts with FULL.
    await prisma.calendarConnection.upsert({
      where: { userId_provider: { userId: privacyUser.id, provider: 'google' } },
      update: { visibility: 'FULL', status: 'CONNECTED' },
      create: {
        userId: privacyUser.id,
        provider: 'google',
        status: 'CONNECTED',
        visibility: 'FULL',
      },
    })

    await prisma.session.deleteMany({ where: { userId: privacyUser.id } })

    const privacySessionToken = randomUUID()
    const privacyExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await prisma.session.create({
      data: { sessionToken: privacySessionToken, userId: privacyUser.id, expires: privacyExpires },
    })

    fs.writeFileSync(
      path.join(AUTH_DIR, 'privacy-user.json'),
      JSON.stringify(buildStorageState(privacySessionToken, privacyExpires), null, 2),
    )

    console.log(`[global-setup] seeded privacy test user: ${privacyUser.email}`)
    console.log('[global-setup] privacy auth state written to e2e/.auth/privacy-user.json')

    // -----------------------------------------------------------------------
    // Calendar-error test user (e2e-calendar-error@family-sync.test)
    // Pre-seeded with a family group and a CalendarConnection in ERROR
    // status, so calendar-connection-edge-cases.spec.ts can assert the
    // schedule page renders a user-facing error notice + reconnect CTA
    // without needing to mock the server-side Google Calendar call (which
    // Playwright route interception cannot reach).
    // -----------------------------------------------------------------------
    const calendarErrorUser = await prisma.user.upsert({
      where: { email: 'e2e-calendar-error@family-sync.test' },
      update: {},
      create: { email: 'e2e-calendar-error@family-sync.test', name: 'E2E Calendar Error User' },
    })

    // Clean any prior family group so state is fresh each run.
    await prisma.familyGroup.deleteMany({
      where: { memberships: { some: { userId: calendarErrorUser.id } } },
    })

    await prisma.familyGroup.create({
      data: {
        name: 'E2E Calendar Error Family',
        memberships: { create: { userId: calendarErrorUser.id, role: 'ORGANIZER' } },
      },
    })

    // Reset the connection to ERROR on every run.
    await prisma.calendarConnection.upsert({
      where: { userId_provider: { userId: calendarErrorUser.id, provider: 'google' } },
      update: { visibility: 'FULL', status: 'ERROR' },
      create: {
        userId: calendarErrorUser.id,
        provider: 'google',
        status: 'ERROR',
        visibility: 'FULL',
      },
    })

    await prisma.session.deleteMany({ where: { userId: calendarErrorUser.id } })

    const calendarErrorSessionToken = randomUUID()
    const calendarErrorExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await prisma.session.create({
      data: { sessionToken: calendarErrorSessionToken, userId: calendarErrorUser.id, expires: calendarErrorExpires },
    })

    fs.writeFileSync(
      path.join(AUTH_DIR, 'calendar-error-user.json'),
      JSON.stringify(buildStorageState(calendarErrorSessionToken, calendarErrorExpires), null, 2),
    )

    console.log(`[global-setup] seeded calendar-error test user: ${calendarErrorUser.email}`)
    console.log('[global-setup] calendar-error auth state written to e2e/.auth/calendar-error-user.json')

    // -----------------------------------------------------------------------
    // Notes test user (e2e-notes@family-sync.test)
    // Pre-seeded with a family group so shared-notes.spec.ts can target the
    // notes area directly without conflicting with family-access.spec.ts,
    // which manages the main test user's family group on the same run.
    // -----------------------------------------------------------------------
    const notesUser = await prisma.user.upsert({
      where: { email: 'e2e-notes@family-sync.test' },
      update: {},
      create: { email: 'e2e-notes@family-sync.test', name: 'E2E Notes User' },
    })

    // Delete any existing family group so state is clean each run.
    // Cascade deletes GroupMembership and SharedNote.
    await prisma.familyGroup.deleteMany({
      where: { memberships: { some: { userId: notesUser.id } } },
    })

    // Pre-seed the family group with the notes user as ORGANIZER.
    await prisma.familyGroup.create({
      data: {
        name: 'E2E Notes Family',
        memberships: {
          create: { userId: notesUser.id, role: 'ORGANIZER' },
        },
      },
    })

    await prisma.session.deleteMany({ where: { userId: notesUser.id } })

    const notesSessionToken = randomUUID()
    const notesExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await prisma.session.create({
      data: { sessionToken: notesSessionToken, userId: notesUser.id, expires: notesExpires },
    })

    fs.writeFileSync(
      path.join(AUTH_DIR, 'notes-user.json'),
      JSON.stringify(buildStorageState(notesSessionToken, notesExpires), null, 2),
    )

    console.log(`[global-setup] seeded notes test user: ${notesUser.email}`)
    console.log('[global-setup] notes auth state written to e2e/.auth/notes-user.json')

    // -----------------------------------------------------------------------
    // Chat refactor test user (e2e-chat@family-sync.test)
    // Pre-seeded with a family group (E2E Chat Family) and a second member
    // (e2e-chat-member2@family-sync.test) so ai-chat-refactor.spec.ts can
    // exercise multi-member schedule queries without conflicting with other
    // test users. Neither member has a CalendarConnection — the AI will see
    // "calendar unavailable" for all members, which is the realistic state
    // achievable in E2E without mocking Google Calendar.
    // -----------------------------------------------------------------------
    const chatUser = await prisma.user.upsert({
      where: { email: 'e2e-chat@family-sync.test' },
      update: {},
      create: { email: 'e2e-chat@family-sync.test', name: 'E2E Chat User' },
    })

    const chatMember2 = await prisma.user.upsert({
      where: { email: 'e2e-chat-member2@family-sync.test' },
      update: {},
      create: { email: 'e2e-chat-member2@family-sync.test', name: 'E2E Chat Member 2' },
    })

    // Clean family groups for both members to avoid stale state.
    await prisma.familyGroup.deleteMany({
      where: { memberships: { some: { userId: chatUser.id } } },
    })

    const chatFamily = await prisma.familyGroup.create({
      data: {
        name: 'E2E Chat Family',
        memberships: {
          create: { userId: chatUser.id, role: 'ORGANIZER' },
        },
      },
    })

    // Add second member separately (Prisma nested createMany not supported).
    await prisma.groupMembership.create({
      data: { userId: chatMember2.id, familyGroupId: chatFamily.id, role: 'MEMBER' },
    })

    await prisma.session.deleteMany({ where: { userId: chatUser.id } })

    const chatSessionToken = randomUUID()
    const chatExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await prisma.session.create({
      data: { sessionToken: chatSessionToken, userId: chatUser.id, expires: chatExpires },
    })

    fs.writeFileSync(
      path.join(AUTH_DIR, 'chat-user.json'),
      JSON.stringify(buildStorageState(chatSessionToken, chatExpires), null, 2),
    )

    console.log(`[global-setup] seeded chat test user: ${chatUser.email}`)
    console.log('[global-setup] chat auth state written to e2e/.auth/chat-user.json')

    // -----------------------------------------------------------------------
    // Email invite test users (Spec 007)
    // -----------------------------------------------------------------------

    const inviteOrganizer = await prisma.user.upsert({
      where: { email: INVITE_ORGANIZER_EMAIL },
      update: {},
      create: { email: INVITE_ORGANIZER_EMAIL, name: INVITE_ORGANIZER_NAME },
    })

    // Delete and recreate the organizer's family group each run so invite
    // tokens are fresh and the recipient's accepted membership is cleared.
    await prisma.familyGroup.deleteMany({
      where: { memberships: { some: { userId: inviteOrganizer.id } } },
    })

    const inviteFamily = await prisma.familyGroup.create({
      data: {
        name: 'E2E Invite Family',
        memberships: { create: { userId: inviteOrganizer.id, role: 'ORGANIZER' } },
      },
    })

    // Recipient — no family group allowed (cleared via cascade above if they
    // accepted a previous run's invite into E2E Invite Family).
    const inviteRecipient = await prisma.user.upsert({
      where: { email: INVITE_RECIPIENT_EMAIL },
      update: {},
      create: { email: INVITE_RECIPIENT_EMAIL, name: INVITE_RECIPIENT_NAME },
    })

    // Already-member user — always in their own separate family group.
    // Apply the name on update too, so a prior run's row (created with an
    // older display name that collides with the email-invites :120 regex) is
    // corrected on every run.
    const inviteAlreadyMember = await prisma.user.upsert({
      where: { email: INVITE_ALREADY_MEMBER_EMAIL },
      update: { name: INVITE_ALREADY_MEMBER_NAME },
      create: { email: INVITE_ALREADY_MEMBER_EMAIL, name: INVITE_ALREADY_MEMBER_NAME },
    })

    await prisma.familyGroup.deleteMany({
      where: { memberships: { some: { userId: inviteAlreadyMember.id } } },
    })

    await prisma.familyGroup.create({
      data: {
        name: 'E2E Already Member Family',
        memberships: { create: { userId: inviteAlreadyMember.id, role: 'ORGANIZER' } },
      },
    })

    // Seed the three known invite tokens for E2E tests.
    await prisma.invite.create({
      data: {
        familyGroupId: inviteFamily.id,
        email: INVITE_RECIPIENT_EMAIL,
        token: INVITE_TOKEN_VALID,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    await prisma.invite.create({
      data: {
        familyGroupId: inviteFamily.id,
        email: 'e2e-expired-invite@family-sync.test',
        token: INVITE_TOKEN_EXPIRED,
        status: 'PENDING',
        expiresAt: new Date('2020-01-01'),
      },
    })

    await prisma.invite.create({
      data: {
        familyGroupId: inviteFamily.id,
        email: INVITE_ALREADY_MEMBER_EMAIL,
        token: INVITE_TOKEN_ALREADY_MEMBER,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    // Sessions for all three invite users.
    await prisma.session.deleteMany({ where: { userId: inviteOrganizer.id } })
    const inviteOrganizerToken = randomUUID()
    const inviteOrganizerExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await prisma.session.create({
      data: { sessionToken: inviteOrganizerToken, userId: inviteOrganizer.id, expires: inviteOrganizerExpires },
    })
    fs.writeFileSync(
      path.join(AUTH_DIR, 'invite-organizer.json'),
      JSON.stringify(buildStorageState(inviteOrganizerToken, inviteOrganizerExpires), null, 2),
    )

    await prisma.session.deleteMany({ where: { userId: inviteRecipient.id } })
    const inviteRecipientToken = randomUUID()
    const inviteRecipientExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await prisma.session.create({
      data: { sessionToken: inviteRecipientToken, userId: inviteRecipient.id, expires: inviteRecipientExpires },
    })
    fs.writeFileSync(
      path.join(AUTH_DIR, 'invite-recipient.json'),
      JSON.stringify(buildStorageState(inviteRecipientToken, inviteRecipientExpires), null, 2),
    )

    await prisma.session.deleteMany({ where: { userId: inviteAlreadyMember.id } })
    const inviteAlreadyMemberToken = randomUUID()
    const inviteAlreadyMemberExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await prisma.session.create({
      data: { sessionToken: inviteAlreadyMemberToken, userId: inviteAlreadyMember.id, expires: inviteAlreadyMemberExpires },
    })
    fs.writeFileSync(
      path.join(AUTH_DIR, 'invite-already-member.json'),
      JSON.stringify(buildStorageState(inviteAlreadyMemberToken, inviteAlreadyMemberExpires), null, 2),
    )

    console.log('[global-setup] seeded email invite test users and known tokens')
  } finally {
    await prisma.$disconnect()
  }
}

function buildStorageState(sessionToken: string, expires: Date) {
  return {
    cookies: [
      {
        name: 'authjs.session-token',
        value: sessionToken,
        domain: 'localhost',
        path: '/',
        expires: Math.floor(expires.getTime() / 1000),
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ],
    origins: [],
  }
}

export default globalSetup
