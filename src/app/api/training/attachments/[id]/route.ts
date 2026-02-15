import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { deleteFile } from '@/lib/s3'
import type { Role } from '@/generated/prisma/client'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'training', 'delete')

    const { id } = await params

    const attachment = await prisma.trainingAttachment.findUnique({ where: { id } })
    if (!attachment) {
      return NextResponse.json({ success: false, error: 'Allegato non trovato' }, { status: 404 })
    }

    // Extract key from URL: remove base URL prefix to get the S3 key
    const url = new URL(attachment.fileUrl)
    // Key is everything after /{bucket}/ in the path
    const pathParts = url.pathname.split('/')
    const key = pathParts.slice(2).join('/')

    await deleteFile(key)
    await prisma.trainingAttachment.delete({ where: { id } })

    return NextResponse.json({ success: true, data: null })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/attachments/id/DELETE]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
