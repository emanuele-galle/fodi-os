import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission, requirePermission, ADMIN_ROLES } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { updateTaskSchema } from '@/lib/validation'
import { getTaskParticipants, dispatchNotification, NotificationBatch } from '@/lib/notifications'
import { sendBadgeUpdate, sendDataChanged } from '@/lib/sse'
import { pushTaskToMicrosoftTodo } from '@/lib/microsoft-sync'
import { ApiError, handleApiError } from '@/lib/api-error'
import { TASK_STATUS_LABELS } from '@/lib/constants'
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
        _count: {
          select: { subtasks: true },
        },
      },
    })

    if (!task) {
      throw new ApiError(404, 'Task non trovato')
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
    return handleApiError(e)
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
        throw new ApiError(404, 'Task non trovato')
      }
      const isCreator = taskCheck.creatorId === currentUserId
      const isAssignee = taskCheck.assigneeId === currentUserId
      const isInAssignments = taskCheck.assignments.some((a) => a.userId === currentUserId)
      if (!isCreator && !isAssignee && !isInAssignments) {
        throw new ApiError(403, 'Permission denied: non sei creatore o assegnatario di questa task')
      }
    }

    const body = await request.json()
    const parsed = updateTaskSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError(400, 'Validazione fallita', parsed.error.flatten().fieldErrors)
    }
    const { title, description, status, priority, boardColumn, assigneeId, assigneeIds, projectId, folderId, milestoneId, dueDate, estimatedHours, sortOrder, tags, parentId } = parsed.data

    // Only ADMIN/DIR_TECNICO can move tasks between projects
    if (projectId !== undefined) {
      if (role !== 'ADMIN' && role !== 'DIR_TECNICO') {
        throw new ApiError(403, 'Solo Admin e Direttore Tecnico possono spostare task tra progetti')
      }
    }

    // Fetch previous state for change tracking and auto-logging
    let previousTask: {
      status: string; title: string; description: string | null; projectId: string | null;
      timerStartedAt: Date | null; timerUserId: string | null; project: { name: string } | null;
      priority: string; dueDate: Date | null; assigneeId: string | null; folderId: string | null;
      milestoneId: string | null; tags: string[];
    } | null = null
    const needsPreviousState = status !== undefined || priority !== undefined || dueDate !== undefined
      || description !== undefined || title !== undefined || assigneeId !== undefined || assigneeIds !== undefined
      || projectId !== undefined || folderId !== undefined || milestoneId !== undefined || tags !== undefined
    if (needsPreviousState) {
      previousTask = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
          status: true, title: true, description: true, projectId: true, timerStartedAt: true,
          timerUserId: true, project: { select: { name: true } }, priority: true, dueDate: true,
          assigneeId: true, folderId: true, milestoneId: true, tags: true,
        },
      })
    }

    // Validate folderId belongs to the correct project
    if (folderId) {
      const targetProjectId = projectId !== undefined ? projectId : (await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } }))?.projectId
      if (targetProjectId) {
        const folder = await prisma.folder.findUnique({ where: { id: folderId }, select: { projectId: true } })
        if (!folder || folder.projectId !== targetProjectId) {
          throw new ApiError(400, 'La cartella non appartiene al progetto selezionato')
        }
      }
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
    // Auto-sync boardColumn when status changes (unless boardColumn explicitly provided)
    if (status !== undefined && boardColumn === undefined) {
      const STATUS_TO_COLUMN: Record<string, string> = {
        TODO: 'todo', IN_PROGRESS: 'in_progress', IN_REVIEW: 'in_review', DONE: 'done', CANCELLED: 'cancelled',
      }
      if (STATUS_TO_COLUMN[status]) data.boardColumn = STATUS_TO_COLUMN[status]
    }
    if (boardColumn !== undefined) data.boardColumn = boardColumn
    if (assigneeId !== undefined) data.assigneeId = assigneeId
    if (projectId !== undefined) {
      data.projectId = projectId
      // When moving to a different project, reset folderId (folders belong to projects)
      if (folderId === undefined) data.folderId = null
    }
    if (folderId !== undefined) data.folderId = folderId
    if (milestoneId !== undefined) data.milestoneId = milestoneId
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
    if (estimatedHours !== undefined) data.estimatedHours = estimatedHours
    if (sortOrder !== undefined) data.sortOrder = sortOrder
    if (tags !== undefined) data.tags = tags
    if (parentId !== undefined) data.parentId = parentId

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
    })

    // Auto-log TimeEntry disabled: presenze tracked via WorkSession/heartbeat

    // --- Notifications (batched to merge multiple changes into 1 notification) ---
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId! },
      select: { firstName: true, lastName: true },
    })
    const actorName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Qualcuno'
    const taskLink = `/tasks?taskId=${taskId}`

    // Fetch project name for metadata
    let taskProjectName: string | undefined
    if (previousTask?.project?.name) {
      taskProjectName = previousTask.project.name
    } else if (task.projectId) {
      const proj = await prisma.project.findUnique({ where: { id: task.projectId as string }, select: { name: true } })
      taskProjectName = proj?.name ?? undefined
    }
    const effectiveProjectId = task.projectId as string | null
    const notifMetadata = { projectName: taskProjectName, taskStatus: status || (previousTask?.status ?? undefined), priority: previousTask?.priority ?? task.priority }

    // Use task participants (not all project members) for reduced audience
    const needsNotification = (status !== undefined && previousTask && status !== previousTask.status)
      || priority !== undefined || dueDate !== undefined || description !== undefined
    const participants = needsNotification ? await getTaskParticipants(taskId) : []

    const batch = new NotificationBatch()

    // Status change notification
    if (status !== undefined && previousTask && status !== previousTask.status) {
      const newLabel = TASK_STATUS_LABELS[status] || status

      if (status === 'DONE') {
        batch.add({
          type: 'task_completed',
          title: 'Task completata',
          message: `${actorName} ha completato "${task.title}"`,
          link: taskLink,
          metadata: notifMetadata,
          projectId: effectiveProjectId ?? undefined,
          groupKey: `task_update:${taskId}`,
          actorName,
          recipientIds: participants,
          excludeUserId: currentUserId,
        })
      } else {
        batch.add({
          type: 'task_status_changed',
          title: 'Stato task cambiato',
          message: `${actorName} ha cambiato lo stato di "${task.title}" in "${newLabel}"`,
          link: taskLink,
          metadata: notifMetadata,
          projectId: effectiveProjectId ?? undefined,
          groupKey: `task_update:${taskId}`,
          actorName,
          recipientIds: participants,
          excludeUserId: currentUserId,
        })
      }
    }

    // Priority/dueDate/description change notification
    if (priority !== undefined || dueDate !== undefined || description !== undefined) {
      const changeDetails: string[] = []
      const priorityLabels: Record<string, string> = { LOW: 'Bassa', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente' }

      if (priority !== undefined && previousTask && priority !== previousTask.priority) {
        const fromLabel = priorityLabels[previousTask.priority] || previousTask.priority
        const toLabel = priorityLabels[priority] || priority
        changeDetails.push(`priorità: ${fromLabel} → ${toLabel}`)
      } else if (priority !== undefined) {
        changeDetails.push('priorità')
      }

      if (dueDate !== undefined && previousTask) {
        const prevDate = previousTask.dueDate ? previousTask.dueDate.toLocaleDateString('it-IT') : 'nessuna'
        const newDate = dueDate ? new Date(dueDate).toLocaleDateString('it-IT') : 'nessuna'
        if (prevDate !== newDate) {
          changeDetails.push(`scadenza: ${prevDate} → ${newDate}`)
        }
      } else if (dueDate !== undefined) {
        changeDetails.push('scadenza')
      }

      if (description !== undefined) changeDetails.push('descrizione')

      if (changeDetails.length > 0) {
        batch.add({
          type: 'task_updated',
          title: 'Task modificata',
          message: `${actorName} ha modificato ${changeDetails.join(', ')} di "${task.title}"`,
          link: taskLink,
          metadata: { ...notifMetadata, changeDetails },
          projectId: effectiveProjectId ?? undefined,
          groupKey: `task_update:${taskId}`,
          actorName,
          recipientIds: participants,
          excludeUserId: currentUserId,
        })
      }
    }

    // Flush batch: merges status+priority+etc into 1 notification per user
    await batch.flush()

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
      // Sync assigneeId field with first assignee (keep in sync with assignments)
      if (assigneeId === undefined) {
        await prisma.task.update({
          where: { id: taskId },
          data: { assigneeId: assigneeIds[0] || null },
        })
      }
    }

    // Build detailed changes array for activity log
    const changes: Array<{ field: string; from: unknown; to: unknown }> = []
    if (previousTask) {
      if (title !== undefined && title !== previousTask.title) {
        changes.push({ field: 'title', from: previousTask.title, to: title })
      }
      if (description !== undefined && description !== (previousTask.description || '')) {
        changes.push({ field: 'description', from: previousTask.description ? '...' : null, to: description ? '...' : null })
      }
      if (status !== undefined && status !== previousTask.status) {
        changes.push({ field: 'status', from: previousTask.status, to: status })
      }
      if (priority !== undefined && priority !== previousTask.priority) {
        changes.push({ field: 'priority', from: previousTask.priority, to: priority })
      }
      if (dueDate !== undefined) {
        const prevDate = previousTask.dueDate ? previousTask.dueDate.toISOString().slice(0, 10) : null
        const newDate = dueDate ? new Date(dueDate).toISOString().slice(0, 10) : null
        if (prevDate !== newDate) {
          changes.push({ field: 'dueDate', from: prevDate, to: newDate })
        }
      }
      if (assigneeId !== undefined && assigneeId !== previousTask.assigneeId) {
        changes.push({ field: 'assigneeId', from: previousTask.assigneeId, to: assigneeId })
      }
      if (projectId !== undefined && projectId !== previousTask.projectId) {
        changes.push({ field: 'projectId', from: previousTask.projectId, to: projectId })
      }
      if (folderId !== undefined && folderId !== previousTask.folderId) {
        changes.push({ field: 'folderId', from: previousTask.folderId, to: folderId })
      }
      if (milestoneId !== undefined && milestoneId !== previousTask.milestoneId) {
        changes.push({ field: 'milestoneId', from: previousTask.milestoneId, to: milestoneId })
      }
      if (tags !== undefined && JSON.stringify(tags) !== JSON.stringify(previousTask.tags)) {
        changes.push({ field: 'tags', from: previousTask.tags, to: tags })
      }
    }

    logActivity({
      userId: currentUserId!,
      action: 'UPDATE',
      entityType: 'TASK',
      entityId: taskId,
      metadata: {
        title: task.title,
        projectName: taskProjectName || null,
        changedFields: Object.keys(data).join(','),
        changes,
      },
    })

    // Send data_changed to all participants
    const allParticipants = participants.length > 0 ? participants : await getTaskParticipants(taskId)
    if (currentUserId) allParticipants.push(currentUserId)
    sendDataChanged([...new Set(allParticipants)], 'task', taskId)

    // Update badge counts for assignees if status changed
    if (status !== undefined) {
      const taskAssignees = await prisma.taskAssignment.findMany({
        where: { taskId },
        select: { userId: true },
      })
      const assigneeUserIds = taskAssignees.map((a) => a.userId)
      if (task.assigneeId) assigneeUserIds.push(task.assigneeId as string)
      for (const uid of [...new Set(assigneeUserIds)]) {
        const count = await prisma.task.count({
          where: {
            status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] },
            OR: [{ assigneeId: uid }, { assignments: { some: { userId: uid } } }],
          },
        })
        sendBadgeUpdate(uid, { tasks: count })
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

    // Sync to Microsoft To Do (fire-and-forget)
    pushTaskToMicrosoftTodo(taskId, 'update').catch(() => {})

    return NextResponse.json({ success: true, data: fullTask })
  } catch (e) {
    return handleApiError(e)
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
      select: { id: true, title: true, creatorId: true, assigneeId: true, project: { select: { name: true } }, assignments: { select: { userId: true } } },
    })
    if (!existing) {
      throw new ApiError(404, 'Task non trovato')
    }

    // Allow delete if user has pm:delete OR is creator/assignee of this task
    if (!hasPermission(role, 'pm', 'delete')) {
      requirePermission(role, 'pm', 'write')
      const isCreator = existing.creatorId === userId
      const isAssignee = existing.assigneeId === userId
      const isInAssignments = existing.assignments.some((a) => a.userId === userId)
      if (!isCreator && !isAssignee && !isInAssignments) {
        throw new ApiError(403, 'Puoi eliminare solo le task che hai creato o che ti sono assegnate')
      }
    }

    // Collect participants before deletion
    const deleteParticipants = [
      existing.creatorId,
      ...(existing.assigneeId ? [existing.assigneeId] : []),
      ...existing.assignments.map((a) => a.userId),
    ]

    // Sync deletion to Microsoft To Do before deleting (fire-and-forget)
    pushTaskToMicrosoftTodo(taskId, 'delete').catch(() => {})

    await prisma.task.delete({ where: { id: taskId } })

    logActivity({ userId, action: 'DELETE', entityType: 'TASK', entityId: taskId, metadata: { title: existing.title, projectName: existing.project?.name || null } })

    // Notify about data change
    sendDataChanged([...new Set(deleteParticipants)], 'task', taskId)

    // Update badge counts for assignees
    for (const uid of [...new Set(deleteParticipants)]) {
      const count = await prisma.task.count({
        where: {
          status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] },
          OR: [{ assigneeId: uid }, { assignments: { some: { userId: uid } } }],
        },
      })
      sendBadgeUpdate(uid, { tasks: count })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return handleApiError(e)
  }
}
