import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { getTaskParticipants, dispatchNotification } from '@/lib/notifications'
import type { Role } from '@/generated/prisma/client'
import { z } from 'zod'

const createCommentSchema = z.object({
  content: z.string().min(1, 'Commento obbligatorio').max(5000),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const { taskId } = await params

    const comments = await prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json({ items: comments })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tasks/:taskId/comments]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    // Tutti gli utenti autenticati che possono leggere le task possono commentare
    requirePermission(role, 'pm', 'read')

    const { taskId } = await params
    const body = await request.json()
    const parsed = createCommentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })
    }

    const comment = await prisma.comment.create({
      data: {
        taskId,
        authorId: userId,
        content: parsed.data.content,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    })

    // Notify task participants only (not all project members) with grouping
    const recipients = await getTaskParticipants(taskId)
    const authorName = `${comment.author.firstName} ${comment.author.lastName}`
    await dispatchNotification({
      type: 'task_comment',
      title: 'Nuovo commento',
      message: `${authorName} ha commentato "${task.title}"`,
      link: `/tasks?taskId=${taskId}&commentId=${comment.id}`,
      projectId: task.projectId ?? undefined,
      groupKey: `task_comment:${taskId}`,
      actorName: authorName,
      recipientIds: recipients,
      excludeUserId: userId,
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tasks/:taskId/comments]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
