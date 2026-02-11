import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, getDriveService } from '@/lib/google'

// GET /api/drive/files - List files from Google Drive
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const auth = await getAuthenticatedClient(userId)
  if (!auth) {
    return NextResponse.json({ error: 'Google non connesso', connected: false }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const folderId = searchParams.get('folderId') || 'root'
  const search = searchParams.get('search') || ''
  const pageToken = searchParams.get('pageToken') || undefined
  const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') || '30'))

  try {
    const drive = getDriveService(auth)

    let q = `'${folderId}' in parents and trashed = false`
    if (search) {
      q = `name contains '${search.replace(/'/g, "\\'")}' and trashed = false`
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
    })
  } catch (e) {
    console.error('Drive files error:', e)
    return NextResponse.json({ error: 'Errore nel recupero file' }, { status: 500 })
  }
}
