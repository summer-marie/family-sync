import { prisma } from '@/lib/prisma'

export async function getGoogleAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google' },
    select: { access_token: true },
  })

  if (!account?.access_token) {
    throw new Error('No Google access token found for user')
  }

  return account.access_token
}
