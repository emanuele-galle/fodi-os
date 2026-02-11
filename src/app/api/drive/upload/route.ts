import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, getDriveService } from '@/lib/google'
import { Readable } from 'stream'

// POST /api/drive/upload - Upload a file to Google Drive
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const drive = getDriveService(auth)
    const buffer = Buffer.from(await file.arrayBuffer())
    const stream = Readable.from(buffer)

    const res = await drive.files.create({
      requestBody: {
        name: file.name,
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
