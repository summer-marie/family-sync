import { prisma } from '@/lib/prisma'

// ---------------------------------------------------------------------------
// Google access tokens expire after ~1 hour. This refreshes silently using
// the long-lived refresh_token whenever the stored token has expired, so the
// connection keeps working without the user ever needing to reconnect or
// being shown anything — entirely server-side.
// ---------------------------------------------------------------------------

const REFRESH_SKEW_SECONDS = 60 // refresh slightly before actual expiry

async function refreshAccessToken(accountId: string, refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh Google access token')
  }

  const data = (await response.json()) as {
    access_token: string
    expires_in: number
  }

  await prisma.account.update({
    where: { id: accountId },
    data: {
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    },
  })

  return data.access_token
}

export async function getGoogleAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google' },
    select: { id: true, access_token: true, refresh_token: true, expires_at: true },
  })

  if (!account?.access_token) {
    throw new Error('No Google access token found for user')
  }

  const isExpired =
    account.expires_at !== null &&
    account.expires_at < Math.floor(Date.now() / 1000) + REFRESH_SKEW_SECONDS

  if (isExpired) {
    if (!account.refresh_token) {
      throw new Error('Google access token expired and no refresh token is available')
    }
    return refreshAccessToken(account.id, account.refresh_token)
  }

  return account.access_token
}
