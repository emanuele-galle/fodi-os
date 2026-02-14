import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, getDriveService, getDriveRootFolderId, isInsideAllowedFolder } from '@/lib/google'

// GET /api/drive/files - List files from Google Drive (restricted to FODI OS folder)
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const auth = await getAuthenticatedClient(userId)
  if (!auth) {
    return NextResponse.json({ error: 'Google non connesso', connected: false }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const requestedFolderId = searchParams.get('folderId') || ''
  const search = searchParams.get('search') || ''
  const pageToken = searchParams.get('pageToken') || undefined
  const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') || '30'))

  try {
    const drive = getDriveService(auth)
    const rootFolderId = await getDriveRootFolderId(userId)

    // Determine the folder to browse - default to the allowed root
    let folderId = requestedFolderId || rootFolderId

    // Validate that the requested folder is inside the allowed root
    if (folderId !== rootFolderId && rootFolderId !== 'root') {
      const allowed = await isInsideAllowedFolder(drive, folderId, rootFolderId)
      if (!allowed) {
        folderId = rootFolderId // Fall back to root if trying to escape
      }
    }

    let q = `'${folderId}' in parents and trashed = false`
    if (search) {
      // Search within the allowed root folder tree only
      q = `name contains '${search.replace(/'/g, "\\'")}' and trashed = false`
      if (rootFolderId !== 'root') {
        // Use the Drive API's native ancestor restriction isn't available,
        // so we add parent filter to current folder for search
        q = `name contains '${search.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed = false`
      }
    }

    const res = await drive.files.list({
      q,
      pageSize,
      pageToken,
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents, starred)',
      orderBy: 'folder,name',
    })

    const files = (res.data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size ? parseInt(f.size) : 0,
      createdTime: f.createdTime,
      modifiedTime: f.modifiedTime,
      webViewLink: f.webViewLink,
      webContentLink: f.webContentLink,
      iconLink: f.iconLink,
      thumbnailLink: f.thumbnailLink,
      isFolder: f.mimeType === 'application/vnd.google-apps.folder',
      starred: f.starred,
    }))

    return NextResponse.json({
      files,
      nextPageToken: res.data.nextPageToken,
      rootFolderId,
    })
  } catch (e) {
    console.error('Drive files error:', e)
    return NextResponse.json({ error: 'Errore nel recupero file' }, { status: 500 })
  }
}
