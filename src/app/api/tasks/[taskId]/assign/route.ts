import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { dispatchNotification } from '@/lib/notifications'
import { sendBadgeUpdate, sendDataChanged } from '@/lib/sse'
import type { Role } from '@/generated/prisma/client'
import { z } from 'zod'

const assignSchema = z.object({
  assigneeId: z.string().uuid('Assignee ID non valido').optional(),
  add: z.array(z.string().uuid()).default([]),
  remove: z.array(z.string().uuid()).default([]),
  role: z.enum(['assignee', 'reviewer', 'observer']).default('assignee'),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const currentUserId = request.headers.get('x-user-id')
    const { taskId } = await params
    const body = await request.json()
    const parsed = assignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { assigneeId, add, remove, role: assignmentRole } = parsed.data

    // Backward compat: single assigneeId treated as add
    const toAdd = [...add]
    if (assigneeId && !toAdd.includes(assigneeId)) {
      toAdd.push(assigneeId)
    }

    // Remove assignments
    if (remove.length > 0) {
      await prisma.taskAssignment.deleteMany({
        where: { taskId, userId: { in: remove } },
      })
    }

    // Add new assignments
    if (toAdd.length > 0) {
      await prisma.taskAssignment.createMany({
        data: toAdd.map((uid) => ({
          taskId,
          userId: uid,
          role: assignmentRole,
          assignedBy: currentUserId,
        })),
        skipDuplicates: true,
      })
    }

    // Update legacy assigneeId field: first assigned user or null
    const firstAssignment = await prisma.taskAssignment.findFirst({
      where: { taskId },
      orderBy: { assignedAt: 'asc' },
    })
    await prisma.task.update({
      where: { id: taskId },
      data: { assigneeId: firstAssignment?.userId || null },
    })

    // Send notifications for newly added users
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        assignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
          orderBy: { assignedAt: 'asc' },
        },
        project: { select: { name: true } },
      },
    })

    if (task && toAdd.length > 0) {
      await dispatchNotification({
        type: 'task_assigned',
        title: 'Task assegnato',
        message: `Ti è stato assegnato il task "${task.title}"`,
        link: `/tasks?taskId=${taskId}`,
        metadata: { projectName: task.project?.name },
        groupKey: `task_assigned:${taskId}`,
        recipientIds: toAdd,
        excludeUserId: currentUserId,
      })
    }

    // Badge update for new and removed assignees
    const affectedUsers = [...new Set([...toAdd, ...remove])]
    for (const uid of affectedUsers) {
      const count = await prisma.task.count({
        where: {
          status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] },
          OR: [{ assigneeId: uid }, { assignments: { some: { userId: uid } } }],
        },
      })
      sendBadgeUpdate(uid, { tasks: count })
    }

    // Data changed for all involved
    const allInvolved = [...affectedUsers]
    if (currentUserId) allInvolved.push(currentUserId)
    sendDataChanged([...new Set(allInvolved)], 'task', taskId)

    return NextResponse.json(task)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tasks/:taskId/assign]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
