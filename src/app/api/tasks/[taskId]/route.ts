import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission, requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
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
      return NextResponse.json({ success: false, error: 'Task non trovato' }, { status: 404 })
    }

    // Resolve assignedBy user names
    const assignedByIds = [...new Set(
      task.assignments.map((a) => a.assignedBy).filter((id): id is string => id != null)
    )]
    const assignedByUsers = assignedByIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: assignedByIds } },
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        })
      : []
    const assignedByMap = Object.fromEntries(assignedByUsers.map((u) => [u.id, u]))

    const enrichedTask = {
      ...task,
      assignments: task.assignments.map((a) => ({
        ...a,
        assignedByUser: a.assignedBy ? assignedByMap[a.assignedBy] || null : null,
      })),
    }

    return NextResponse.json({ success: true, data: enrichedTask, ...enrichedTask })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tasks/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
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
        return NextResponse.json({ success: false, error: 'Task non trovato' }, { status: 404 })
      }
      const isCreator = taskCheck.creatorId === currentUserId
      const isAssignee = taskCheck.assigneeId === currentUserId
      const isInAssignments = taskCheck.assignments.some((a) => a.userId === currentUserId)
      if (!isCreator && !isAssignee && !isInAssignments) {
        return NextResponse.json({ success: false, error: 'Permission denied: non sei creatore o assegnatario di questa task' }, { status: 403 })
      }
    }

    const body = await request.json()
    const parsed = updateTaskSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { title, description, status, priority, boardColumn, assigneeId, assigneeIds, folderId, milestoneId, dueDate, estimatedHours, sortOrder, tags } = parsed.data

    // Fetch previous state for auto-logging on status change
    let previousTask: { status: string; title: string; projectId: string | null; timerStartedAt: Date | null; timerUserId: string | null; project: { name: string } | null; priority: string } | null = null
    if (status !== undefined) {
      previousTask = await prisma.task.findUnique({
        where: { id: taskId },
        select: { status: true, title: true, projectId: true, timerStartedAt: true, timerUserId: true, project: { select: { name: true } }, priority: true },
      })
    }

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (status !== undefined) {
      data.status = status
      if (status === 'DONE') data.completedAt = new Date()
      else data.completedAt = null

      // Reset timer fields on status change (auto-log disabled)
      if (status === 'IN_PROGRESS') {
        data.timerStartedAt = new Date()
        data.timerUserId = currentUserId
      }
      if (
        (status === 'DONE' || status === 'IN_REVIEW') &&
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

    // Auto-log TimeEntry disabled: presenze tracked via WorkSession/heartbeat

    // --- Notifications ---
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId! },
      select: { firstName: true, lastName: true },
    })
    const actorName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Qualcuno'
    const taskLink = `/tasks?taskId=${taskId}`

    // Fetch project name for metadata (use previousTask if available, otherwise fetch)
    let taskProjectName: string | undefined
    if (previousTask?.project?.name) {
      taskProjectName = previousTask.project.name
    } else if (task.projectId) {
      const proj = await prisma.project.findUnique({ where: { id: task.projectId as string }, select: { name: true } })
      taskProjectName = proj?.name ?? undefined
    }
    const notifMetadata = { projectName: taskProjectName, taskStatus: status || (previousTask?.status ?? undefined), priority: previousTask?.priority ?? task.priority }

    // Fetch participants once for all notifications
    const needsNotification = (status !== undefined && previousTask && status !== previousTask.status)
      || priority !== undefined || dueDate !== undefined || description !== undefined
    const participants = needsNotification ? await getTaskParticipants(taskId) : []

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
            metadata: notifMetadata,
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
              metadata: notifMetadata,
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
              metadata: notifMetadata,
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
            metadata: notifMetadata,
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
        await notifyUsers(
          participants,
          currentUserId,
          {
            type: 'task_updated',
            title: 'Task modificata',
            message: `${actorName} ha modificato ${changes.join(', ')} di "${task.title}"`,
            link: taskLink,
            metadata: notifMetadata,
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
      // Create new assignments (skip existing)
      if (assigneeIds.length > 0) {
        await prisma.taskAssignment.createMany({
          data: assigneeIds.map((uid) => ({
            taskId,
            userId: uid,
            role: 'assignee',
            assignedBy: currentUserId,
          })),
          skipDuplicates: true,
        })
      }
    }

    logActivity({
      userId: currentUserId!,
      action: 'UPDATE',
      entityType: 'TASK',
      entityId: taskId,
      metadata: { changedFields: Object.keys(data).join(',') },
    })

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

    // Resolve assignedBy user names for PATCH response
    if (fullTask) {
      const patchAssignedByIds = [...new Set(
        fullTask.assignments.map((a) => a.assignedBy).filter((id): id is string => id != null)
      )]
      if (patchAssignedByIds.length > 0) {
        const patchAssignedByUsers = await prisma.user.findMany({
          where: { id: { in: patchAssignedByIds } },
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        })
        const patchMap = Object.fromEntries(patchAssignedByUsers.map((u) => [u.id, u]))
        const enriched = {
          ...fullTask,
          assignments: fullTask.assignments.map((a) => ({
            ...a,
            assignedByUser: a.assignedBy ? patchMap[a.assignedBy] || null : null,
          })),
        }
        return NextResponse.json({ success: true, data: enriched })
      }
    }

    return NextResponse.json({ success: true, data: fullTask })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tasks/PATCH]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    const { taskId } = await params

    // Check task exists
    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, creatorId: true, assigneeId: true, assignments: { select: { userId: true } } },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Task non trovato' }, { status: 404 })
    }

    // Allow delete if user has pm:delete OR is creator/assignee of this task
    if (!hasPermission(role, 'pm', 'delete')) {
      requirePermission(role, 'pm', 'write')
      const isCreator = existing.creatorId === userId
      const isAssignee = existing.assigneeId === userId
      const isInAssignments = existing.assignments.some((a) => a.userId === userId)
      if (!isCreator && !isAssignee && !isInAssignments) {
        return NextResponse.json({ success: false, error: 'Puoi eliminare solo le task che hai creato o che ti sono assegnate' }, { status: 403 })
      }
    }

    await prisma.task.delete({ where: { id: taskId } })

    logActivity({ userId, action: 'DELETE', entityType: 'TASK', entityId: taskId })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
