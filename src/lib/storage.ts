import { brand } from '@/lib/branding'
import { google } from 'googleapis'
import { prisma } from './prisma'
import { getAuthenticatedClient, getDriveService } from './google'
import { uploadFile as s3Upload, deleteFile as s3Delete, isR2Active } from './s3'
import { logger } from '@/lib/logger'

// Cached admin drive client (avoid DB query on every upload)
let cachedAdminDrive: { drive: ReturnType<typeof google.drive>; expiresAt: number } | null = null

/**
 * Get the admin user's Google Drive client.
 * Uses GOOGLE_DRIVE_ADMIN_ID if set, otherwise the first ADMIN with Google connected.
 * Caches the client for 5 minutes.
 */
export async function getAdminDriveClient() {
  // Return cached client if still valid
  if (cachedAdminDrive && cachedAdminDrive.expiresAt > Date.now()) {
    return cachedAdminDrive.drive
  }

  const specificAdminId = process.env.GOOGLE_DRIVE_ADMIN_ID

  const adminToken = specificAdminId
    ? await prisma.googleToken.findUnique({
        where: { userId: specificAdminId },
        include: { user: { select: { id: true } } },
      })
    : await prisma.googleToken.findFirst({
        where: { user: { role: 'ADMIN' } },
        include: { user: { select: { id: true } } },
      })

  if (!adminToken) {
    throw new Error('Nessun admin con Google Drive connesso. Collegare Google Drive dalle Impostazioni.')
  }

  const auth = await getAuthenticatedClient(adminToken.userId)
  if (!auth) {
    throw new Error('Token Google admin non valido. Ricollegare Google Drive dalle Impostazioni.')
  }

  const drive = getDriveService(auth)
  cachedAdminDrive = { drive, expiresAt: Date.now() + 5 * 60 * 1000 }
  return drive
}

/**
 * Check if Google Drive is available (configured and admin connected).
 * Returns false without throwing if GDrive is not available.
 */
export async function isGDriveAvailable(): Promise<boolean> {
  if (!process.env.GOOGLE_CLIENT_ID) return false
  try {
    await getAdminDriveClient()
    return true
  } catch {
    return false
  }
}

/**
 * Ensure a folder exists on Google Drive, creating it if necessary.
 * Returns the folder ID.
 */
export async function ensureGDriveFolder(
  drive: ReturnType<typeof google.drive>,
  folderName: string,
  parentId?: string
): Promise<string> {
  // Search for existing folder
  const query = [
    `name = '${folderName.replace(/'/g, "\\'")}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `trashed = false`,
    parentId ? `'${parentId}' in parents` : `'root' in parents`,
  ].join(' and ')

  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  })

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!
  }

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id',
  })

  return folder.data.id!
}

/**
 * Upload a file to Google Drive in the project folder structure:
 * ${brand.driveFolderName} / Progetti / {projectName} / file
 * OR
 * ${brand.driveFolderName} / CRM / {companyName} / file
 *
 * Sets the file as publicly viewable (anyone with the link).
 *
 * @param folderPath - Can be a simple name like "ProjectName" (default: Progetti/ProjectName)
 *                     or a path like "CRM/CompanyName" for CRM documents
 */
export async function uploadToGDrive(
  fileName: string,
  buffer: Buffer,
  mimeType: string,
  folderPath: string
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = await getAdminDriveClient()

  // Ensure folder structure: ${brand.driveFolderName} / [folder structure]
  const rootFolderId = await ensureGDriveFolder(drive, brand.driveFolderName)

  // Parse folder path (e.g., "CRM/CompanyName" or "ProjectName")
  const pathParts = folderPath.split('/')
  let currentParentId = rootFolderId

  if (pathParts.length === 1) {
    // Default: ${brand.driveFolderName} / Progetti / {projectName}
    const projectsFolderId = await ensureGDriveFolder(drive, 'Progetti', rootFolderId)
    currentParentId = await ensureGDriveFolder(drive, pathParts[0], projectsFolderId)
  } else {
    // Custom path: ${brand.driveFolderName} / {part1} / {part2} / ...
    for (const part of pathParts) {
      currentParentId = await ensureGDriveFolder(drive, part, currentParentId)
    }
  }

  const projectFolderId = currentParentId

  // Upload file
  const { Readable } = await import('stream')
  const stream = Readable.from(buffer)

  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [projectFolderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, webViewLink',
  })

  const fileId = file.data.id!

  // Set permission: anyone with the link can view
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  })

  // Re-fetch to get the correct webViewLink after permission change
  const updated = await drive.files.get({
    fileId,
    fields: 'webViewLink',
  })

  return {
    fileId,
    webViewLink: updated.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
  }
}

export interface UploadResult {
  fileUrl: string
  driveFileId?: string
  webViewLink?: string
}

/**
 * Upload a file with multi-backend storage:
 *   - R2 (primary CDN) + MinIO (local backup) — handled transparently by s3Upload
 *   - Google Drive (optional additional backup) — best-effort
 *
 * @param fileName - sanitized file name
 * @param buffer - file content
 * @param mimeType - MIME type
 * @param s3Key - object key (e.g., "projects/{projectId}/{timestamp}-{random}.ext")
 * @param gDrivePath - optional Google Drive folder path (e.g., "ProjectName" or "CRM/CompanyName")
 */
export async function uploadWithBackup(
  fileName: string,
  buffer: Buffer,
  mimeType: string,
  s3Key: string,
  gDrivePath?: string
): Promise<UploadResult> {
  // 1. Upload to R2 (primary) + MinIO (local backup) — s3Upload handles both
  const fileUrl = await s3Upload(s3Key, buffer, mimeType)

  const result: UploadResult = { fileUrl }

  // 2. Upload to Google Drive (optional additional backup, best-effort)
  if (gDrivePath) {
    try {
      const { fileId, webViewLink } = await uploadToGDrive(fileName, buffer, mimeType, gDrivePath)
      result.driveFileId = fileId
      result.webViewLink = webViewLink
    } catch (err) {
      logger.warn(`[storage] Google Drive backup upload failed for "${fileName}"`, { error: (err as Error).message })
    }
  }

  return result
}

/**
 * Delete a file from both storage backends (best-effort for both).
 *
 * @param fileUrl - MinIO file URL (to extract S3 key)
 * @param driveFileId - optional Google Drive file ID
 */
export async function deleteWithBackup(fileUrl: string, driveFileId?: string | null): Promise<void> {
  // 1. Delete from Google Drive (best-effort)
  if (driveFileId) {
    try {
      await deleteFromGDrive(driveFileId)
    } catch (err) {
      logger.warn(`[storage] Google Drive delete failed for "${driveFileId}"`, { error: (err as Error).message })
    }
  }

  // 2. Delete from MinIO (best-effort)
  try {
    const key = extractS3Key(fileUrl)
    if (key) {
      await s3Delete(key)
    }
  } catch (err) {
    logger.warn(`[storage] MinIO delete failed for "${fileUrl}"`, { error: (err as Error).message })
  }
}

/**
 * Extract the object key from a file URL (works with both R2 and MinIO URLs).
 *
 * R2 URL:   https://files.domain.com/projects/123/file.pdf  → projects/123/file.pdf
 * MinIO URL: https://s3.domain.com/bucket/projects/123/file.pdf → projects/123/file.pdf
 */
function extractS3Key(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl)
    // R2 URL: no bucket prefix in path, key is the full pathname
    const r2PublicUrl = process.env.R2_PUBLIC_URL
    if (r2PublicUrl && fileUrl.startsWith(r2PublicUrl)) {
      return url.pathname.slice(1) // remove leading /
    }
    // MinIO URL: remove leading /{bucket}/ from pathname
    const match = url.pathname.match(/^\/[^/]+\/(.+)$/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

/**
 * Rename a file on Google Drive.
 */
export async function renameOnGDrive(fileId: string, newName: string): Promise<void> {
  const drive = await getAdminDriveClient()
  await drive.files.update({
    fileId,
    requestBody: { name: newName },
  })
}

/**
 * Delete a file from Google Drive by its file ID.
 */
export async function deleteFromGDrive(fileId: string): Promise<void> {
  const drive = await getAdminDriveClient()
  await drive.files.delete({ fileId })
}
