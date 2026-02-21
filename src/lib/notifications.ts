import { prisma } from '@/lib/prisma'
import { sseManager, sendBadgeUpdate } from '@/lib/sse'
import { sendPush } from '@/lib/push'
import type { Prisma } from '@/generated/prisma/client'

interface CreateNotificationParams {
  userId: string
  type: string
  title: string
  message: string
  link?: string
  metadata?: Record<string, unknown>
  projectId?: string
}

/**
 * Creates a notification in DB, sends SSE real-time event, and triggers web push.
 * Use this helper everywhere instead of duplicating notification logic.
 */
export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, title, message, link, metadata, projectId } = params

  const notification = await prisma.notification.create({
    data: { userId, type, title, message, link, metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined, projectId: projectId ?? null },
  })

  sseManager.sendToUser(userId, {
    type: 'notification',
    data: { id: notification.id, type, title, message, link, metadata },
  })

  // Send badge update with fresh unread count
  const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } })
  sendBadgeUpdate(userId, { notifications: unreadCount })

  sendPush(userId, { title, message, link })

  return notification
}

/**
 * Creates notifications for multiple users at once.
 * Skips the excludeUserId (typically the user who performed the action).
 */
export async function notifyUsers(
  userIds: string[],
  excludeUserId: string | null,
  params: Omit<CreateNotificationParams, 'userId'>
) {
  const recipients = userIds.filter((id) => id !== excludeUserId)
  if (recipients.length === 0) return

  // Bulk insert
  const data = recipients.map((userId) => ({
    userId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link,
    metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    projectId: params.projectId ?? null,
  }))
  await prisma.notification.createMany({ data })

  // SSE + Push per user + badge update
  for (const userId of recipients) {
    sseManager.sendToUser(userId, {
      type: 'notification',
      data: { type: params.type, title: params.title, message: params.message, link: params.link, metadata: params.metadata },
    })
    const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } })
    sendBadgeUpdate(userId, { notifications: unreadCount })
    sendPush(userId, { title: params.title, message: params.message, link: params.link })
  }
}

/**
 * Get all participant user IDs for a task (creator + all assignees + commenters).
 */
export async function getTaskParticipants(taskId: string): Promise<string[]> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      creatorId: true,
      assignments: { select: { userId: true } },
      comments: { select: { authorId: true } },
    },
  })
  if (!task) return []

  const ids = new Set<string>()
  ids.add(task.creatorId)
  for (const a of task.assignments) ids.add(a.userId)
  for (const c of task.comments) ids.add(c.authorId)

  return Array.from(ids)
}

/**
 * Get all member user IDs for a project.
 */
export async function getProjectMembers(projectId: string): Promise<string[]> {
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  })
  return members.map((m) => m.userId)
}
