import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission, requirePermission } from '@/lib/permissions'
import { updateTaskSchema } from '@/lib/validation'
import { getTaskParticipants, notifyUsers } from '@/lib/notifications'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const { taskId } = await params

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
        creator: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
        subtasks: {
          orderBy: { sortOrder: 'asc' },
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            assignments: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
              },
              orderBy: { assignedAt: 'asc' },
            },
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        },
        timeEntries: {
          orderBy: { date: 'desc' },
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        dependsOn: {
          include: { dependsOn: { select: { id: true, title: true, status: true } } },
        },
        dependedOnBy: {
          include: { task: { select: { id: true, title: true, status: true } } },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
          include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const currentUserId = request.headers.get('x-user-id')
    const { taskId } = await params

    // Allow edit if user has pm:write OR is creator/assignee of this task
    if (!hasPermission(role, 'pm', 'write')) {
      requirePermission(role, 'pm', 'read')
      const taskCheck = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
          creatorId: true,
          assigneeId: true,
          assignments: { select: { userId: true } },
        },
      })
      if (!taskCheck) {
        return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })
      }
      const isCreator = taskCheck.creatorId === currentUserId
      const isAssignee = taskCheck.assigneeId === currentUserId
      const isInAssignments = taskCheck.assignments.some((a) => a.userId === currentUserId)
      if (!isCreator && !isAssignee && !isInAssignments) {
        return NextResponse.json({ error: 'Permission denied: non sei creatore o assegnatario di questa task' }, { status: 403 })
      }
    }

    const body = await request.json()
    const parsed = updateTaskSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { title, description, status, priority, boardColumn, assigneeId, assigneeIds, folderId, milestoneId, dueDate, estimatedHours, sortOrder, tags } = parsed.data

    // Fetch previous state for auto-logging on status change
    let previousTask: { status: string; title: string; projectId: string | null; timerStartedAt: Date | null; timerUserId: string | null } | null = null
    if (status !== undefined) {
      previousTask = await prisma.task.findUnique({
        where: { id: taskId },
        select: { status: true, title: true, projectId: true, timerStartedAt: true, timerUserId: true },
      })
    }

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (status !== undefined) {
      data.status = status
      if (status === 'DONE') data.completedAt = new Date()
      else data.completedAt = null

      // Auto-log: start timer tracking when moving to IN_PROGRESS
      if (status === 'IN_PROGRESS') {
        data.timerStartedAt = new Date()
        data.timerUserId = currentUserId
      }

      // Auto-log: stop timer and create TimeEntry when leaving IN_PROGRESS
      if (
        (status === 'DONE' || status === 'IN_REVIEW') &&
        previousTask?.status === 'IN_PROGRESS' &&
        previousTask?.timerStartedAt
      ) {
        data.timerStartedAt = null
        data.timerUserId = null
      }
    }
    if (priority !== undefined) data.priority = priority
    if (boardColumn !== undefined) data.boardColumn = boardColumn
    if (assigneeId !== undefined) data.assigneeId = assigneeId
    if (folderId !== undefined) data.folderId = folderId
    if (milestoneId !== undefined) data.milestoneId = milestoneId
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
    if (estimatedHours !== undefined) data.estimatedHours = estimatedHours
    if (sortOrder !== undefined) data.sortOrder = sortOrder
    if (tags !== undefined) data.tags = tags

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
    })

    // Auto-create TimeEntry when transitioning from IN_PROGRESS to DONE/IN_REVIEW
    if (
      status !== undefined &&
      (status === 'DONE' || status === 'IN_REVIEW') &&
      previousTask?.status === 'IN_PROGRESS' &&
      previousTask?.timerStartedAt
    ) {
      const startTime = new Date(previousTask.timerStartedAt)
      const endTime = new Date()
      const diffMs = endTime.getTime() - startTime.getTime()
      const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100

      const timeEntry = await prisma.timeEntry.create({
        data: {
          userId: previousTask.timerUserId || currentUserId!,
          taskId,
          projectId: previousTask.projectId,
          date: startTime,
          hours: Math.max(hours, 0.01),
          description: `Auto-log: cambio stato → ${status === 'DONE' ? 'Completato' : 'In Revisione'} (${previousTask.title})`,
          billable: true,
        },
      })

      await prisma.activityLog.create({
        data: {
          userId: previousTask.timerUserId || currentUserId!,
          action: 'AUTO_TIME_LOG',
          entityType: 'TimeEntry',
          entityId: timeEntry.id,
          metadata: {
            taskId,
            taskTitle: previousTask.title,
            hours: Math.max(hours, 0.01),
            fromStatus: 'IN_PROGRESS',
            toStatus: status,
          },
        },
      })
    }

    // --- Notifications ---
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId! },
      select: { firstName: true, lastName: true },
    })
    const actorName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Qualcuno'
    const taskLink = `/tasks?taskId=${taskId}`

    // Status change notification
    if (status !== undefined && previousTask && status !== previousTask.status) {
      const statusLabels: Record<string, string> = {
        TODO: 'Da fare',
        IN_PROGRESS: 'In corso',
        IN_REVIEW: 'In revisione',
        DONE: 'Completata',
        CANCELLED: 'Cancellata',
      }
      const newLabel = statusLabels[status] || status
      const participants = await getTaskParticipants(taskId)

      // If completed, special notification to creator + assigners
      if (status === 'DONE') {
        // Get assignedBy users from task assignments
        const assignments = await prisma.taskAssignment.findMany({
          where: { taskId },
          select: { assignedBy: true },
        })
        const assignerIds = [...new Set(
          assignments
            .map((a) => a.assignedBy)
            .filter((id): id is string => id != null && id !== currentUserId && id !== task.creatorId)
        )]

        // Notify creator
        await notifyUsers(
          [task.creatorId],
          currentUserId,
          {
            type: 'task_completed',
            title: 'Task completata',
            message: `${actorName} ha completato "${task.title}"`,
            link: taskLink,
          }
        )

        // Notify assigners (who assigned this task to someone)
        if (assignerIds.length > 0) {
          await notifyUsers(
            assignerIds,
            currentUserId,
            {
              type: 'task_completed',
              title: 'Task completata',
              message: `${actorName} ha completato "${task.title}"`,
              link: taskLink,
            }
          )
        }

        // Notify other participants (excluding creator and assigners, already notified above)
        const alreadyNotified = new Set([task.creatorId, ...assignerIds])
        const others = participants.filter((id) => !alreadyNotified.has(id))
        if (others.length > 0) {
          await notifyUsers(
            others,
            currentUserId,
            {
              type: 'task_status_changed',
              title: 'Stato task cambiato',
              message: `${actorName} ha completato "${task.title}"`,
              link: taskLink,
            }
          )
        }
      } else {
        await notifyUsers(
          participants,
          currentUserId,
          {
            type: 'task_status_changed',
            title: 'Stato task cambiato',
            message: `${actorName} ha cambiato lo stato di "${task.title}" in "${newLabel}"`,
            link: taskLink,
          }
        )
      }
    }

    // Priority/dueDate/description change notification
    if (priority !== undefined || dueDate !== undefined || description !== undefined) {
      const changes: string[] = []
      if (priority !== undefined) changes.push('priorita')
      if (dueDate !== undefined) changes.push('scadenza')
      if (description !== undefined) changes.push('descrizione')

      if (changes.length > 0) {
        const participants = await getTaskParticipants(taskId)
        await notifyUsers(
          participants,
          currentUserId,
          {
            type: 'task_updated',
            title: 'Task modificata',
            message: `${actorName} ha modificato ${changes.join(', ')} di "${task.title}"`,
            link: taskLink,
          }
        )
      }
    }

    // Handle multi-assignee updates
    if (assigneeIds !== undefined) {
      // Remove assignments not in the new list
      await prisma.taskAssignment.deleteMany({
        where: { taskId, userId: { notIn: assigneeIds } },
      })
      // Upsert new assignments
      for (const uid of assigneeIds) {
        await prisma.taskAssignment.upsert({
          where: { taskId_userId: { taskId, userId: uid } },
          update: {},
          create: { taskId, userId: uid, role: 'assignee', assignedBy: currentUserId },
        })
      }
    }

    // Re-fetch with full includes
    const fullTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        assignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
          orderBy: { assignedAt: 'asc' },
        },
      },
    })

    return NextResponse.json(fullTask)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'delete')

    const { taskId } = await params

    await prisma.task.delete({ where: { id: taskId } })

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
