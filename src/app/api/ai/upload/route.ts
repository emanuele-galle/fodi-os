import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders } from '@/lib/api-utils'
import { uploadFile } from '@/lib/s3'
import crypto from 'crypto'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 3
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
])

export async function POST(request: NextRequest) {
  const auth = getAuthHeaders(request)
  if (!auth.ok) return auth.response

  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: 'Nessun file caricato' }, { status: 400 })
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Massimo ${MAX_FILES} file per messaggio` }, { status: 400 })
    }

    const results: { url: string; mimeType: string; fileName: string }[] = []

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `Tipo file non supportato: ${file.type}. Accettati: immagini (JPG, PNG, WebP) e PDF.` },
          { status: 400 },
        )
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" troppo grande. Massimo 10MB.` },
          { status: 400 },
        )
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
      const randomId = crypto.randomBytes(8).toString('hex')
      const key = `ai-attachments/${auth.userId}/${Date.now()}-${randomId}.${ext}`

      const buffer = Buffer.from(await file.arrayBuffer())
      const url = await uploadFile(key, buffer, file.type)

      results.push({
        url,
        mimeType: file.type,
        fileName: file.name,
      })
    }

    return NextResponse.json({ files: results })
  } catch (err) {
    console.error('[ai/upload]', err)
    return NextResponse.json({ error: 'Errore upload file' }, { status: 500 })
  }
}
