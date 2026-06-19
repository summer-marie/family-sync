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
