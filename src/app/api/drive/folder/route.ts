import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, getDriveService, getDriveRootFolderId, isInsideAllowedFolder } from '@/lib/google'
import { getAdminDriveClient } from '@/lib/storage'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

// POST /api/drive/folder - Create a folder on Google Drive (restricted to FODI OS)
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
    console.error('[drive/folder]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }

  // Try user's own Google account first, fallback to admin account
  let drive
  const auth = await getAuthenticatedClient(userId)
  if (auth) {
    drive = getDriveService(auth)
  } else {
    try {
      drive = await getAdminDriveClient()
    } catch {
      return NextResponse.json({ error: 'Google non connesso', connected: false }, { status: 403 })
    }
  }

  const body = await request.json()
  const { name, parentId } = body

  if (!name) {
    return NextResponse.json({ error: 'Nome cartella obbligatorio' }, { status: 400 })
  }

  try {
    const rootFolderId = await getDriveRootFolderId(userId)

    // Validate parentId is inside allowed folder
    const targetParent = parentId || rootFolderId
    if (rootFolderId !== 'root' && targetParent !== rootFolderId) {
      const allowed = await isInsideAllowedFolder(drive, targetParent, rootFolderId)
      if (!allowed) {
        return NextResponse.json({ error: 'Non puoi creare cartelle fuori dalla cartella FODI OS' }, { status: 403 })
      }
    }

    const res = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [targetParent],
      },
      fields: 'id, name, mimeType, webViewLink',
    })

    return NextResponse.json(res.data, { status: 201 })
  } catch (e) {
    console.error('Drive folder create error:', e)
    return NextResponse.json({ error: 'Errore creazione cartella' }, { status: 500 })
  }
}
