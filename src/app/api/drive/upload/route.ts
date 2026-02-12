import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, getDriveService } from '@/lib/google'
import { Readable } from 'stream'

// POST /api/drive/upload - Upload a file to Google Drive
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const auth = await getAuthenticatedClient(userId)
  if (!auth) {
    return NextResponse.json({ error: 'Google non connesso', connected: false }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folderId = (formData.get('folderId') as string) || 'root'

    if (!file) {
      return NextResponse.json({ error: 'File obbligatorio' }, { status: 400 })
    }

    // Max 100MB for Drive uploads
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File troppo grande (max 100 MB)' }, { status: 400 })
    }

    // Block dangerous file types
    const blockedExts = ['exe', 'bat', 'cmd', 'sh', 'php', 'jsp', 'cgi', 'msi', 'dll', 'scr', 'ps1']
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (blockedExts.includes(ext)) {
      return NextResponse.json({ error: 'Tipo di file non consentito' }, { status: 400 })
    }

    // Sanitize filename (remove path traversal characters)
    const safeName = file.name.replace(/[\/\\:*?"<>|]/g, '_')

    const drive = getDriveService(auth)
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
