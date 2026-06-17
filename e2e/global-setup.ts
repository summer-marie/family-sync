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
const AUTH_DIR = path.join(process.cwd(), 'e2e', '.auth')

async function globalSetup() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  })

  try {
    const user = await prisma.user.upsert({
      where: { email: TEST_USER_EMAIL },
      update: {},
      create: { email: TEST_USER_EMAIL, name: TEST_USER_NAME },
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
      JSON.stringify(
        {
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
        },
        null,
        2,
      ),
    )

    console.log(`[global-setup] seeded test user: ${user.email}`)
    console.log('[global-setup] auth state written to e2e/.auth/user.json')
  } finally {
    await prisma.$disconnect()
  }
}

export default globalSetup
