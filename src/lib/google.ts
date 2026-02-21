import { google } from 'googleapis'
import { prisma } from './prisma'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive',
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

export function getCalendarService(auth: InstanceType<typeof google.auth.OAuth2>) {
  return google.calendar({ version: 'v3', auth })
}

export function getDriveService(auth: InstanceType<typeof google.auth.OAuth2>) {
  return google.drive({ version: 'v3', auth })
}

export function getMeetService(auth: InstanceType<typeof google.auth.OAuth2>) {
  return google.meet({ version: 'v2', auth })
}

/**
 * Get the restricted root folder ID for Drive browsing.
 * Falls back to resolving the "FODI OS" folder from admin account.
 */
let _cachedRootFolderId: string | null = null

export async function getDriveRootFolderId(userId: string): Promise<string> {
  // 1. From env var (fastest)
  if (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
    return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  }

  // 2. From cache
  if (_cachedRootFolderId) return _cachedRootFolderId

  // 3. Find the "FODI OS" folder dynamically
  const auth = await getAuthenticatedClient(userId)
  if (!auth) return 'root'

  const drive = getDriveService(auth)
  try {
    const res = await drive.files.list({
      q: "name = 'FODI OS' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and 'root' in parents",
      fields: 'files(id)',
      spaces: 'drive',
    })
    if (res.data.files && res.data.files.length > 0) {
      _cachedRootFolderId = res.data.files[0].id!
      return _cachedRootFolderId
    }
  } catch {
    // Fall through
  }

  return 'root'
}

/**
 * Validate that a folder ID is within the allowed "FODI OS" folder tree.
 * Walks up parents until it finds the root folder or reaches Drive root.
 */
export async function isInsideAllowedFolder(
  drive: ReturnType<typeof google.drive>,
  folderId: string,
  allowedRootId: string
): Promise<boolean> {
  if (folderId === allowedRootId) return true

  let currentId = folderId
  const maxDepth = 10 // Prevent infinite loops

  for (let i = 0; i < maxDepth; i++) {
    try {
      const file = await drive.files.get({
        fileId: currentId,
        fields: 'parents',
      })
      const parents = file.data.parents
      if (!parents || parents.length === 0) return false
      if (parents.includes(allowedRootId)) return true
      currentId = parents[0]
    } catch {
      return false
    }
  }

  return false
}
