import { prisma } from './prisma'
import { logger } from '@/lib/logger'
import {
  getOrCreateTodoList,
  createTodoTask,
  updateTodoTask,
  deleteTodoTask,
  listTodoTasks,
  isMicrosoftConfigured,
} from './microsoft-graph'

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'FODI OS'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

type OsStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED'
type TodoStatus = 'notStarted' | 'inProgress' | 'completed'
type OsPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
type TodoImportance = 'low' | 'normal' | 'high'

function statusToTodo(status: string): TodoStatus {
  switch (status) {
    case 'IN_PROGRESS':
    case 'IN_REVIEW':
      return 'inProgress'
    case 'DONE':
    case 'CANCELLED':
      return 'completed'
    default:
      return 'notStarted'
  }
}

function statusFromTodo(todoStatus: string): OsStatus {
  switch (todoStatus) {
    case 'inProgress':
      return 'IN_PROGRESS'
    case 'completed':
      return 'DONE'
    default:
      return 'TODO'
  }
}

function priorityToTodo(priority: string): TodoImportance {
  switch (priority) {
    case 'HIGH':
    case 'URGENT':
      return 'high'
    case 'LOW':
      return 'low'
    default:
      return 'normal'
  }
}

function priorityFromTodo(importance: string): OsPriority {
  switch (importance) {
    case 'high':
      return 'HIGH'
    case 'low':
      return 'LOW'
    default:
      return 'MEDIUM'
  }
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ---------------------------------------------------------------------------
// Push: OS → Microsoft To Do
// ---------------------------------------------------------------------------

/**
 * Sync a single task from OS to Microsoft To Do.
 * Called after task create/update/delete in the API routes.
 * Runs async (fire-and-forget) to not block the API response.
 */
export async function pushTaskToMicrosoftTodo(taskId: string, action: 'create' | 'update' | 'delete'): Promise<void> {
  if (!isMicrosoftConfigured()) return

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        microsoftTodoId: true,
        creatorId: true,
        assigneeId: true,
        assignments: { select: { userId: true } },
      },
    })

    if (!task && action !== 'delete') return

    // Get all users connected to Microsoft that are involved with this task
    const userIds = new Set<string>()
    if (task) {
      userIds.add(task.creatorId)
      if (task.assigneeId) userIds.add(task.assigneeId)
      task.assignments.forEach((a) => userIds.add(a.userId))
    }

    const connectedUsers = await prisma.microsoftToken.findMany({
      where: { userId: { in: Array.from(userIds) } },
    })

    if (connectedUsers.length === 0) return

    for (const msToken of connectedUsers) {
      try {
        const listId = await getOrCreateTodoList(msToken.userId, BRAND_NAME)

        if (action === 'delete') {
          if (task?.microsoftTodoId) {
            await deleteTodoTask(msToken.userId, listId, task.microsoftTodoId)
          }
          continue
        }

        if (!task) continue

        const input = {
          title: task.title,
          body: stripHtml(task.description),
          status: statusToTodo(task.status),
          importance: priorityToTodo(task.priority),
          dueDateTime: task.dueDate ? task.dueDate.toISOString().split('T')[0] + 'T00:00:00' : null,
          linkedUrl: `${SITE_URL}/tasks?taskId=${task.id}`,
        }

        if (action === 'create' || !task.microsoftTodoId) {
          const todoId = await createTodoTask(msToken.userId, listId, input)
          await prisma.task.update({
            where: { id: task.id },
            data: {
              microsoftTodoId: todoId,
              microsoftLastSync: new Date(),
            },
          })
        } else {
          await updateTodoTask(msToken.userId, listId, task.microsoftTodoId, input)
          await prisma.task.update({
            where: { id: task.id },
            data: { microsoftLastSync: new Date() },
          })
        }

        // Only sync once per task (first connected user handles it)
        break
      } catch (err) {
        logger.error(`[microsoft-sync] Push failed for user ${msToken.userId}: ${err}`)
      }
    }
  } catch (err) {
    logger.error(`[microsoft-sync] pushTaskToMicrosoftTodo error: ${err}`)
  }
}

// ---------------------------------------------------------------------------
// Initial sync: push all existing OS tasks to Microsoft To Do
// ---------------------------------------------------------------------------

/**
 * Push all non-completed tasks for a user to Microsoft To Do.
 * Called once after initial OAuth connection.
 */
export async function initialSyncToMicrosoftTodo(userId: string): Promise<number> {
  if (!isMicrosoftConfigured()) return 0

  const msToken = await prisma.microsoftToken.findUnique({ where: { userId } })
  if (!msToken) return 0

  let synced = 0

  try {
    const listId = await getOrCreateTodoList(userId, BRAND_NAME)

    // Get all tasks where user is creator or assignee, not yet synced (including completed)
    const tasks = await prisma.task.findMany({
      where: {
        microsoftTodoId: null,
        status: { notIn: ['CANCELLED'] },
        OR: [
          { creatorId: userId },
          { assigneeId: userId },
          { assignments: { some: { userId } } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200, // Limit to avoid rate limits
    })

    for (const task of tasks) {
      try {
        const input = {
          title: task.title,
          body: stripHtml(task.description),
          status: statusToTodo(task.status),
          importance: priorityToTodo(task.priority),
          dueDateTime: task.dueDate ? task.dueDate.toISOString().split('T')[0] + 'T00:00:00' : null,
          linkedUrl: `${SITE_URL}/tasks?taskId=${task.id}`,
        }

        const todoId = await createTodoTask(userId, listId, input)
        await prisma.task.update({
          where: { id: task.id },
          data: {
            microsoftTodoId: todoId,
            microsoftLastSync: new Date(),
          },
        })
        synced++
      } catch (err) {
        logger.error(`[microsoft-sync] Initial sync failed for task ${task.id}: ${err}`)
      }
    }

    logger.info(`[microsoft-sync] Initial sync completed: ${synced}/${tasks.length} tasks pushed to To Do for user ${userId}`)
  } catch (err) {
    logger.error(`[microsoft-sync] initialSyncToMicrosoftTodo error: ${err}`)
  }

  return synced
}

// ---------------------------------------------------------------------------
// Pull: Microsoft To Do → OS (delta sync)
// ---------------------------------------------------------------------------

/**
 * Pull changes from Microsoft To Do for a specific user.
 * Compares lastModifiedDateTime with microsoftLastSync to detect changes.
 */
export async function pullFromMicrosoftTodo(userId: string): Promise<number> {
  if (!isMicrosoftConfigured()) return 0

  const msToken = await prisma.microsoftToken.findUnique({ where: { userId } })
  if (!msToken?.todoListId) return 0

  let changesApplied = 0

  try {
    const todoTasks = await listTodoTasks(userId, msToken.todoListId)

    for (const todoTask of todoTasks) {
      // Find matching OS task by microsoftTodoId
      const osTask = await prisma.task.findUnique({
        where: { microsoftTodoId: todoTask.id },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          updatedAt: true,
          microsoftLastSync: true,
        },
      })

      if (!osTask) continue // Task was created in To Do, skip (only sync OS-created tasks)

      // Compare timestamps: if To Do was modified after our last sync, pull changes
      const todoModified = new Date(todoTask.lastModifiedDateTime)
      const lastSync = osTask.microsoftLastSync || new Date(0)

      if (todoModified <= lastSync) continue // No changes from To Do side

      // Check if OS was also modified after last sync (conflict)
      if (osTask.updatedAt > lastSync && todoModified > lastSync) {
        // Both modified — last-write-wins
        if (osTask.updatedAt > todoModified) {
          // OS wins, push our version back
          continue
        }
        // To Do wins, apply below
      }

      const updates: Record<string, unknown> = {}

      // Sync status
      const newStatus = statusFromTodo(todoTask.status)
      if (newStatus !== osTask.status) {
        updates.status = newStatus
        if (newStatus === 'DONE') {
          updates.completedAt = todoTask.completedDateTime?.dateTime
            ? new Date(todoTask.completedDateTime.dateTime)
            : new Date()
        } else {
          updates.completedAt = null
        }
        // Sync boardColumn
        const STATUS_TO_COLUMN: Record<string, string> = {
          TODO: 'todo', IN_PROGRESS: 'in_progress', IN_REVIEW: 'in_review', DONE: 'done', CANCELLED: 'cancelled',
        }
        if (STATUS_TO_COLUMN[newStatus]) updates.boardColumn = STATUS_TO_COLUMN[newStatus]
      }

      // Sync title
      if (todoTask.title !== osTask.title) {
        updates.title = todoTask.title
      }

      // Sync priority
      const newPriority = priorityFromTodo(todoTask.importance)
      if (newPriority !== osTask.priority) {
        updates.priority = newPriority
      }

      // Sync due date
      if (todoTask.dueDateTime?.dateTime) {
        const todoDue = new Date(todoTask.dueDateTime.dateTime)
        const osDue = osTask.dueDate
        if (!osDue || todoDue.toISOString().split('T')[0] !== osDue.toISOString().split('T')[0]) {
          updates.dueDate = todoDue
        }
      } else if (osTask.dueDate) {
        updates.dueDate = null
      }

      if (Object.keys(updates).length > 0) {
        updates.microsoftLastSync = new Date()
        await prisma.task.update({
          where: { id: osTask.id },
          data: updates,
        })
        changesApplied++
        logger.info(`[microsoft-sync] Pulled changes for task ${osTask.id} from To Do`)
      }
    }
  } catch (err) {
    logger.error(`[microsoft-sync] pullFromMicrosoftTodo error for user ${userId}: ${err}`)
  }

  return changesApplied
}

// ---------------------------------------------------------------------------
// Full sync for all connected users (called by cron)
// ---------------------------------------------------------------------------

export async function syncAllMicrosoftUsers(): Promise<void> {
  if (!isMicrosoftConfigured()) return

  const tokens = await prisma.microsoftToken.findMany({
    select: { userId: true },
  })

  for (const { userId } of tokens) {
    try {
      await pullFromMicrosoftTodo(userId)
    } catch (err) {
      logger.error(`[microsoft-sync] syncAll error for user ${userId}: ${err}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Webhook handler: process change notification from Microsoft Graph
// ---------------------------------------------------------------------------

export async function handleMicrosoftWebhook(
  subscriptionId: string,
  resourceData: { id?: string },
  changeType: string
): Promise<void> {
  // Find which user this subscription belongs to
  const token = await prisma.microsoftToken.findFirst({
    where: { webhookSubId: subscriptionId },
  })
  if (!token) {
    logger.warn(`[microsoft-sync] Unknown webhook subscription: ${subscriptionId}`)
    return
  }

  if (!resourceData?.id || !token.todoListId) return

  if (changeType === 'deleted') {
    // Task deleted in To Do — mark as CANCELLED in OS
    const osTask = await prisma.task.findUnique({
      where: { microsoftTodoId: resourceData.id },
    })
    if (osTask && osTask.status !== 'CANCELLED') {
      await prisma.task.update({
        where: { id: osTask.id },
        data: {
          status: 'CANCELLED',
          boardColumn: 'cancelled',
          microsoftLastSync: new Date(),
        },
      })
    }
    return
  }

  // For created/updated, pull the specific task
  await pullFromMicrosoftTodo(token.userId)
}
