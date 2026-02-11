import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, getDriveService } from '@/lib/google'

// POST /api/drive/folder - Create a folder on Google Drive
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const auth = await getAuthenticatedClient(userId)
  if (!auth) {
    return NextResponse.json({ error: 'Google non connesso', connected: false }, { status: 403 })
  }

  const body = await request.json()
  const { name, parentId } = body

  if (!name) {
    return NextResponse.json({ error: 'Nome cartella obbligatorio' }, { status: 400 })
  }

  try {
    const drive = getDriveService(auth)
    const res = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId && { parents: [parentId] }),
      },
      fields: 'id, name, mimeType, webViewLink',
    })

    return NextResponse.json(res.data, { status: 201 })
  } catch (e) {
    console.error('Drive folder create error:', e)
    return NextResponse.json({ error: 'Errore creazione cartella' }, { status: 500 })
  }
}
