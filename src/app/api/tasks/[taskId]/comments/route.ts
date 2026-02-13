import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { sseManager } from '@/lib/sse'
import { sendPush } from '@/lib/push'
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
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
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

    // Notify task creator + all assignees (except comment author)
    const taskWithAssignments = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignments: { select: { userId: true } },
      },
    })
    if (taskWithAssignments) {
      const recipientIds = new Set<string>()
      if (taskWithAssignments.creatorId !== userId) {
        recipientIds.add(taskWithAssignments.creatorId)
      }
      for (const a of taskWithAssignments.assignments) {
        if (a.userId !== userId) recipientIds.add(a.userId)
      }
      if (recipientIds.size > 0) {
        const authorName = `${comment.author.firstName} ${comment.author.lastName}`
        const notifData = Array.from(recipientIds).map((uid) => ({
          userId: uid,
          type: 'task_comment',
          title: 'Nuovo commento',
          message: `${authorName} ha commentato il task "${task.title}"`,
          link: '/tasks',
        }))
        await prisma.notification.createMany({ data: notifData })
        for (const nd of notifData) {
          sseManager.sendToUser(nd.userId, {
            type: 'notification',
            data: { type: nd.type, title: nd.title, message: nd.message, link: nd.link },
          })
          sendPush(nd.userId, { title: nd.title, message: nd.message, link: nd.link })
        }
      }
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
