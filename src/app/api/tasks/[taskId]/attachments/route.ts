import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'
import { z } from 'zod'

const createAttachmentSchema = z.object({
  fileName: z.string().min(1, 'Nome file obbligatorio'),
  fileUrl: z.string().min(1, 'URL file obbligatorio'),
  fileSize: z.number().int().positive('Dimensione file non valida'),
  mimeType: z.string().min(1, 'Tipo MIME obbligatorio'),
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
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
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

    const { fileName, fileUrl, fileSize, mimeType } = parsed.data

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
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
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

    await prisma.taskAttachment.delete({ where: { id: attachmentId } })

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
