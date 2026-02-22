import { brand } from '@/lib/branding'
import { google } from 'googleapis'
import { prisma } from './prisma'
import { getAuthenticatedClient, getDriveService } from './google'

/**
 * Get the admin user's Google Drive client.
 * Uses the first ADMIN user who has a connected Google account.
 */
export async function getAdminDriveClient() {
  const adminToken = await prisma.googleToken.findFirst({
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

  return getDriveService(auth)
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
