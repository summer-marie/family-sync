import { google } from 'googleapis'

export function getOAuthClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET,
  )
  oauth2Client.setCredentials({ access_token: accessToken })
  return oauth2Client
}

export function getCalendarClient(accessToken: string) {
  const auth = getOAuthClient(accessToken)
  return google.calendar({ version: 'v3', auth })
}

/**
 * Pull-on-demand read of a user's primary calendar events within the given
 * time window. Returns raw Google Calendar API event objects for the
 * caller (the schedule service) to normalize.
 *
 * MVP constraints:
 * - No background sync, no webhooks, no caching mirror in Neon.
 * - On failure the caller is expected to degrade to a privacy-safe
 *   `unavailable` state rather than surfacing partial data.
 *
 * NOTE: This does not implement silent token auto-refresh in Step 3.
 * Reconnect requires the user to re-authenticate via Google OAuth.
 * If auto-refresh is added later it must be covered by dedicated tests.
 */
export async function listCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
) {
  const calendar = getCalendarClient(accessToken)
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  })
  return res.data.items ?? []
}
