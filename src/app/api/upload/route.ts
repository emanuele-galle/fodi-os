import { NextRequest, NextResponse } from 'next/server'
import { uploadFile } from '@/lib/s3'
import type { Role } from '@/generated/prisma/client'

/**
 * POST /api/upload
 * Generic file upload to MinIO. Returns fileUrl, fileName, fileSize, mimeType.
 * Used by TaskDetailModal, FileUpload, and other components that need MinIO uploads
 * without creating Asset records.
 */
export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'File obbligatorio' }, { status: 400 })
    }

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())
    const safeFileName = file.name.replace(/[\/\\:*?"<>|]/g, '_')
    const mimeType = file.type || 'application/octet-stream'

    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    const projectId = formData.get('projectId') as string | null
    const prefix = projectId ? `projects/${projectId}` : `uploads/${userId}`
    const key = `${prefix}/${timestamp}-${random}.${ext}`
    const fileUrl = await uploadFile(key, buffer, mimeType)

    return NextResponse.json({
      fileName: safeFileName,
      fileUrl,
      fileSize: file.size,
      mimeType,
    }, { status: 201 })
  } catch (e) {
    console.error('[upload]', e)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
