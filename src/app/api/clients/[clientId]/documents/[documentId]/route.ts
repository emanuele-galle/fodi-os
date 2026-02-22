import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { deleteWithBackup } from '@/lib/storage'
import type { Role } from '@/generated/prisma/client'

type Params = { params: Promise<{ clientId: string; documentId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { clientId, documentId } = await params

    const document = await prisma.document.findFirst({
      where: { id: documentId, clientId },
    })

    if (!document) {
      return NextResponse.json({ success: false, error: 'Documento non trovato' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: document })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[clients/:clientId/documents/:documentId GET]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'crm', 'delete')

    const { clientId, documentId } = await params

    const document = await prisma.document.findFirst({
      where: { id: documentId, clientId },
    })

    if (!document) {
      return NextResponse.json({ success: false, error: 'Documento non trovato' }, { status: 404 })
    }

    // Determine driveFileId: use the field if available, otherwise extract from URL (legacy)
    let driveFileId = document.driveFileId
    if (!driveFileId) {
      const urlMatch = document.fileUrl.match(/\/d\/([^\/]+)\//)
      if (urlMatch && urlMatch[1]) {
        driveFileId = urlMatch[1]
      }
    }

    // Delete from both MinIO and GDrive
    await deleteWithBackup(document.fileUrl, driveFileId)

    await prisma.document.delete({ where: { id: documentId } })

    logActivity({
      userId,
      action: 'DELETE_DOCUMENT',
      entityType: 'CLIENT',
      entityId: clientId,
      metadata: { documentId, fileName: document.name },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[clients/:clientId/documents/:documentId DELETE]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
