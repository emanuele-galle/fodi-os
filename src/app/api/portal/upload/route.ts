import { NextRequest, NextResponse } from 'next/server'
import { requirePortalClient, handlePortalError } from '@/lib/portal-auth'
import { uploadFile } from '@/lib/s3'
import { validateFile } from '@/lib/file-validation'

export async function POST(request: NextRequest) {
  try {
    const client = await requirePortalClient(request)

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'File obbligatorio' }, { status: 400 })
    }

    const safeName = file.name.replace(/[\/\\:*?"<>|]/g, '_').replace(/\.{2,}/g, '.')
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()

    const buffer = Buffer.from(await file.arrayBuffer())

    const validationError = validateFile(safeName, file.size, file.type || 'application/octet-stream', buffer)
    if (validationError) {
      return NextResponse.json({ error: validationError.message }, { status: 400 })
    }

    const key = `portal/${client.id}/uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
    const fileUrl = await uploadFile(key, buffer, file.type)

    return NextResponse.json({
      fileName: safeName,
      fileUrl,
      fileSize: file.size,
      mimeType: file.type,
    })
  } catch (e) {
    return handlePortalError(e, 'portal/upload')
  }
}
