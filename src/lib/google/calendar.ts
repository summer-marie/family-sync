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
