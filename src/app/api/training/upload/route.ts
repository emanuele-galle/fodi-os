import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { uploadFile } from '@/lib/s3'
import type { Role } from '@/generated/prisma/client'

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'training', 'write')

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const courseSlug = formData.get('courseSlug') as string | null

    if (!file) {
      return NextResponse.json({ success: false, error: 'File obbligatorio' }, { status: 400 })
    }
    if (!courseSlug) {
      return NextResponse.json({ success: false, error: 'courseSlug obbligatorio' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const timestamp = Date.now()
    const key = `training/${courseSlug}/${timestamp}-${file.name}`

    const url = await uploadFile(key, buffer, file.type)

    return NextResponse.json({
      success: true,
      data: {
        url,
        key,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/upload/POST]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
