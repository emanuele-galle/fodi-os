import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { deleteFile } from '@/lib/s3'
import { validateExternalLink } from '@/lib/link-validation'
import type { Role } from '@/generated/prisma/client'
import { z } from 'zod'

const createAttachmentSchema = z.object({
  fileName: z.string().min(1, 'Nome file obbligatorio'),
  fileUrl: z.string().min(1, 'URL file obbligatorio'),
  fileSize: z.number().int().nonnegative('Dimensione file non valida'),
  mimeType: z.string().min(1, 'Tipo MIME obbligatorio'),
  type: z.enum(['FILE', 'EXTERNAL']).optional(),
  linkProvider: z.string().optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const { taskId } = await params

    const attachments = await prisma.taskAttachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json({ items: attachments })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tasks/:taskId/attachments]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'pm', 'write')

    const { taskId } = await params
    const body = await request.json()
    const parsed = createAttachmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { fileName, fileUrl, fileSize, mimeType, type, linkProvider } = parsed.data

    // Validate external link if type is EXTERNAL
    if (type === 'EXTERNAL') {
      const linkResult = validateExternalLink(fileUrl)
      if (!linkResult.valid) {
        return NextResponse.json({ error: linkResult.error }, { status: 400 })
      }
    }

    // Verify task exists
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } })
    if (!task) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })
    }

    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId,
        uploadedById: userId,
        fileName,
        fileUrl,
        fileSize,
        mimeType,
        type: type || 'FILE',
        linkProvider: linkProvider || null,
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    logActivity({
      userId,
      action: 'UPLOAD_TASK_ATTACHMENT',
      entityType: 'TASK',
      entityId: taskId,
      metadata: { attachmentId: attachment.id, fileName },
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tasks/:taskId/attachments]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'pm', 'write')

    const { taskId } = await params
    const { searchParams } = request.nextUrl
    const attachmentId = searchParams.get('attachmentId')

    if (!attachmentId) {
      return NextResponse.json({ error: 'attachmentId obbligatorio' }, { status: 400 })
    }

    const attachment = await prisma.taskAttachment.findFirst({
      where: { id: attachmentId, taskId },
    })
    if (!attachment) {
      return NextResponse.json({ error: 'Allegato non trovato' }, { status: 404 })
    }

    // Skip storage deletion for external links
    if (attachment.type !== 'EXTERNAL') {
      try {
        const url = new URL(attachment.fileUrl)
        const keyMatch = url.pathname.match(/^\/[^/]+\/(.+)$/)
        if (keyMatch) {
          await deleteFile(keyMatch[1])
        }
      } catch (err) {
        console.warn(`[tasks/:taskId/attachments] Failed to delete S3 file for attachment ${attachmentId}:`, (err as Error).message)
      }
    }

    await prisma.taskAttachment.delete({ where: { id: attachmentId } })

    logActivity({
      userId,
      action: 'DELETE_TASK_ATTACHMENT',
      entityType: 'TASK',
      entityId: taskId,
      metadata: { attachmentId, fileName: attachment.fileName },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tasks/:taskId/attachments]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
