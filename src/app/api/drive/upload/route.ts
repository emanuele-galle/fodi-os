import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, getDriveService, getDriveRootFolderId, isInsideAllowedFolder } from '@/lib/google'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'
import { Readable } from 'stream'

// POST /api/drive/upload - Upload a file to Google Drive (restricted to FODI OS)
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[drive/upload]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }

  const auth = await getAuthenticatedClient(userId)
  if (!auth) {
    return NextResponse.json({ error: 'Google non connesso', connected: false }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const requestedFolderId = (formData.get('folderId') as string) || ''

    if (!file) {
      return NextResponse.json({ error: 'File obbligatorio' }, { status: 400 })
    }

    // Sanitize filename (remove path traversal characters)
    const safeName = file.name.replace(/[\/\\:*?"<>|]/g, '_')

    const drive = getDriveService(auth)
    const rootFolderId = await getDriveRootFolderId(userId)

    // Validate target folder is inside allowed root
    const folderId = requestedFolderId || rootFolderId
    if (rootFolderId !== 'root' && folderId !== rootFolderId) {
      const allowed = await isInsideAllowedFolder(drive, folderId, rootFolderId)
      if (!allowed) {
        return NextResponse.json({ error: 'Non puoi caricare file fuori dalla cartella FODI OS' }, { status: 403 })
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const stream = Readable.from(buffer)

    const res = await drive.files.create({
      requestBody: {
        name: safeName,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: 'id, name, mimeType, size, webViewLink',
    })

    return NextResponse.json(res.data, { status: 201 })
  } catch (e) {
    console.error('Drive upload error:', e)
    return NextResponse.json({ error: 'Errore upload file' }, { status: 500 })
  }
}
