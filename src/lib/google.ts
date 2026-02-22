import { google } from 'googleapis'
import { prisma } from './prisma'

// Warn at startup if Google is not configured (GDrive will be disabled gracefully)
if (!process.env.GOOGLE_CLIENT_ID) {
  console.warn('[google] GOOGLE_CLIENT_ID non configurato. Google Calendar, Drive e Meet saranno disabilitati.')
}

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/meetings.space.settings',
  'https://www.googleapis.com/auth/meetings.space.created',
]

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
]

export function getAuthUrl(state: string) {
  const client = createOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
    include_granted_scopes: true,
  })
}

/**
 * Check if the stored scope string contains all required scopes for calendar.
 */
export function hasRequiredScopes(scope: string | null | undefined): boolean {
  if (!scope) return false
  return REQUIRED_SCOPES.every((s) => scope.includes(s))
}

export async function getAuthenticatedClient(userId: string, requireCalendar = true) {
  const tokenRecord = await prisma.googleToken.findUnique({
    where: { userId },
  })

  if (!tokenRecord) return null

  // If calendar access is needed, check that stored scopes are sufficient
  if (requireCalendar && !hasRequiredScopes(tokenRecord.scope)) {
    // Scope insufficienti - elimina token per forzare re-auth con scope completi
    await prisma.googleToken.delete({ where: { userId } })
    return null
  }

  const client = createOAuth2Client()
  client.setCredentials({
    access_token: tokenRecord.accessToken,
    refresh_token: tokenRecord.refreshToken,
    expiry_date: tokenRecord.expiresAt.getTime(),
  })

  // Auto-refresh if expired
  if (tokenRecord.expiresAt.getTime() < Date.now()) {
    try {
      const { credentials } = await client.refreshAccessToken()
      await prisma.googleToken.update({
        where: { userId },
        data: {
          accessToken: credentials.access_token!,
          expiresAt: new Date(credentials.expiry_date!),
          ...(credentials.refresh_token && { refreshToken: credentials.refresh_token }),
        },
      })
      client.setCredentials(credentials)
    } catch {
      // Token revoked or invalid - delete it
      await prisma.googleToken.delete({ where: { userId } })
      return null
    }
  }

  return client
}

export type AuthErrorReason = 'no_token' | 'scopes' | 'token_expired' | null

export interface AuthCheckResult {
  client: InstanceType<typeof google.auth.OAuth2> | null
  error: AuthErrorReason
}

/**
 * Check auth status with structured error info.
 * Unlike getAuthenticatedClient which returns null for all failures,
 * this returns the reason so routes can respond appropriately.
 */
export async function checkAuthStatus(userId: string, requireCalendar = true): Promise<AuthCheckResult> {
  const tokenRecord = await prisma.googleToken.findUnique({
    where: { userId },
  })

  if (!tokenRecord) return { client: null, error: 'no_token' }

  if (requireCalendar && !hasRequiredScopes(tokenRecord.scope)) {
    await prisma.googleToken.delete({ where: { userId } })
    return { client: null, error: 'scopes' }
  }

  const client = createOAuth2Client()
  client.setCredentials({
    access_token: tokenRecord.accessToken,
    refresh_token: tokenRecord.refreshToken,
    expiry_date: tokenRecord.expiresAt.getTime(),
  })

  if (tokenRecord.expiresAt.getTime() < Date.now()) {
    try {
      const { credentials } = await client.refreshAccessToken()
      await prisma.googleToken.update({
        where: { userId },
        data: {
          accessToken: credentials.access_token!,
          expiresAt: new Date(credentials.expiry_date!),
          ...(credentials.refresh_token && { refreshToken: credentials.refresh_token }),
        },
      })
      client.setCredentials(credentials)
    } catch {
      await prisma.googleToken.delete({ where: { userId } })
      return { client: null, error: 'token_expired' }
    }
  }

  return { client, error: null }
}

/**
 * Retry wrapper for Google API calls with exponential backoff.
 * Retries on transient errors (429, 500, 503).
 */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (err: unknown) {
      const status = (err as { code?: number })?.code ||
        (err as { response?: { status?: number } })?.response?.status
      if ([429, 500, 503].includes(status as number) && i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000))
        continue
      }
      throw err
    }
  }
  throw new Error('Max retries exceeded')
}

/**
 * Check if a Google API error is a scope/permission error.
 */
export function isScopeError(err: unknown): boolean {
  const message = (err as { message?: string })?.message || ''
  const status = (err as { code?: number })?.code ||
    (err as { response?: { status?: number } })?.response?.status
  return (
    status === 403 &&
    (message.includes('insufficient authentication scopes') ||
     message.includes('Insufficient Permission') ||
     message.includes('insufficientPermissions'))
  )
}

export function getCalendarService(auth: InstanceType<typeof google.auth.OAuth2>) {
  return google.calendar({ version: 'v3', auth })
}

export function getDriveService(auth: InstanceType<typeof google.auth.OAuth2>) {
  return google.drive({ version: 'v3', auth })
}

export function getMeetService(auth: InstanceType<typeof google.auth.OAuth2>) {
  return google.meet({ version: 'v2', auth })
}

