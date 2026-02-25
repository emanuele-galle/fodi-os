import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

// GET /api/projects/:projectId/attachments/:attachmentId/download
// Proxy download with Content-Disposition: attachment to force file download
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; attachmentId: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const { projectId, attachmentId } = await params

    const attachment = await prisma.projectAttachment.findFirst({
      where: { id: attachmentId, projectId },
    })

    if (!attachment) {
      return NextResponse.json({ error: 'Allegato non trovato' }, { status: 404 })
    }

    // Fetch the file from storage (R2/MinIO)
    const fileRes = await fetch(attachment.fileUrl, {
      signal: AbortSignal.timeout(30000),
    })

    if (!fileRes.ok) {
      console.error(`[download] Failed to fetch file: ${fileRes.status} ${attachment.fileUrl}`)
      return NextResponse.json({ error: 'File non disponibile' }, { status: 502 })
    }

    const fileBuffer = await fileRes.arrayBuffer()

    // Sanitize filename for Content-Disposition header
    const safeFileName = attachment.fileName.replace(/[^\w\s.\-()]/g, '_')

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': attachment.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
        'Content-Length': String(attachment.fileSize),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ error: e.message }, { status: 403 })
    }
    console.error('[download]', e)
    return NextResponse.json({ error: 'Errore nel download' }, { status: 500 })
  }
}
