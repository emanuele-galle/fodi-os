import { prisma } from '@/lib/prisma'
import { sseManager, sendBadgeUpdate } from '@/lib/sse'
import { sendPush } from '@/lib/push'
import type { Prisma } from '@/generated/prisma/client'

// ============================================================
// TYPES
// ============================================================

interface CreateNotificationParams {
  userId: string
  type: string
  title: string
  message: string
  link?: string
  metadata?: Record<string, unknown>
  projectId?: string
}

export interface NotificationIntent {
  type: string
  title: string
  message: string
  link?: string
  metadata?: Record<string, unknown>
  projectId?: string
  /** Key for grouping (e.g. "task_comment:{taskId}"). If set, upserts instead of creating */
  groupKey?: string
  /** Name of the actor performing the action */
  actorName?: string
  /** User IDs to notify */
  recipientIds: string[]
  /** User ID to exclude (typically the actor) */
  excludeUserId?: string | null
}

// ============================================================
// PREFERENCE CACHE (5 min TTL)
// ============================================================

const prefCache = new Map<string, { prefs: Map<string, boolean>; ts: number }>()
const PREF_TTL = 5 * 60 * 1000

async function getUserPrefs(userId: string): Promise<Map<string, boolean>> {
  const cached = prefCache.get(userId)
  if (cached && Date.now() - cached.ts < PREF_TTL) return cached.prefs

  const rows = await prisma.notificationPreference.findMany({
    where: { userId },
    select: { type: true, channel: true, enabled: true },
  })

  const prefs = new Map<string, boolean>()
  for (const row of rows) {
    prefs.set(`${row.type}:${row.channel}`, row.enabled)
  }
  prefCache.set(userId, { prefs, ts: Date.now() })
  return prefs
}

function isEnabled(prefs: Map<string, boolean>, type: string, channel: string): boolean {
  const key = `${type}:${channel}`
  if (prefs.has(key)) return prefs.get(key)!
  // Default: all enabled except task_created
  return type !== 'task_created'
}

export function clearPrefCache(userId: string) {
  prefCache.delete(userId)
}

// ============================================================
// CORE: dispatchNotification
// ============================================================

/**
 * Smart notification dispatch with grouping, preference checks, and dedup.
 *
 * When groupKey is provided:
 * - If an unread notification with same userId+groupKey exists (last 24h), UPDATE it
 *   (increment groupCount, update message/lastActorName/updatedAt)
 * - Otherwise CREATE a new one
 *
 * Push notifications are throttled: only sent at groupCount 1, 3, 5 to avoid spam.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export async function dispatchNotification(intent: NotificationIntent) {
  const recipients = intent.recipientIds.filter((id) => id !== intent.excludeUserId)
  if (recipients.length === 0) return

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  for (const userId of recipients) {
    // Check user preferences
    const prefs = await getUserPrefs(userId)
    if (!isEnabled(prefs, intent.type, 'in_app')) continue

    let notificationId: string
    let isUpdate = false
    let newGroupCount = 1

    if (intent.groupKey) {
      // Try to find existing unread notification with same groupKey
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          groupKey: intent.groupKey,
          isRead: false,
          createdAt: { gte: twentyFourHoursAgo },
        },
        orderBy: { updatedAt: 'desc' },
      })

      if (existing) {
        // UPDATE existing grouped notification
        newGroupCount = existing.groupCount + 1
        const updated = await prisma.notification.update({
          where: { id: existing.id },
          data: {
            message: intent.message,
            title: intent.title,
            groupCount: newGroupCount,
            lastActorName: intent.actorName || null,
            metadata: (intent.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          },
        })
        notificationId = updated.id
        isUpdate = true
      } else {
        // CREATE new grouped notification
        const created = await prisma.notification.create({
          data: {
            userId,
            type: intent.type,
            title: intent.title,
            message: intent.message,
            link: intent.link,
            metadata: (intent.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
            projectId: intent.projectId ?? null,
            groupKey: intent.groupKey,
            groupCount: 1,
            lastActorName: intent.actorName || null,
          },
        })
        notificationId = created.id
      }
    } else {
      // Non-grouped: simple create
      const created = await prisma.notification.create({
        data: {
          userId,
          type: intent.type,
          title: intent.title,
          message: intent.message,
          link: intent.link,
          metadata: (intent.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          projectId: intent.projectId ?? null,
          groupCount: 1,
          lastActorName: intent.actorName || null,
        },
      })
      notificationId = created.id
    }

    // SSE: send appropriate event type
    const sseEventType = isUpdate ? 'update_notification' : 'notification'
    sseManager.sendToUser(userId, {
      type: sseEventType,
      data: {
        id: notificationId,
        type: intent.type,
        title: intent.title,
        message: intent.message,
        link: intent.link,
        metadata: intent.metadata,
        groupKey: intent.groupKey,
        groupCount: newGroupCount,
        lastActorName: intent.actorName,
      },
    })

    // Badge update
    const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } })
    sendBadgeUpdate(userId, { notifications: unreadCount })

    // Push: only at thresholds (1, 3, 5) and if enabled
    const pushThresholds = [1, 3, 5]
    if (isEnabled(prefs, intent.type, 'push') && pushThresholds.includes(newGroupCount)) {
      sendPush(userId, { title: intent.title, message: intent.message, link: intent.link })
    }
  }
}

// ============================================================
// NOTIFICATION BATCH (for composite actions)
// ============================================================

/**
 * Collects multiple notification intents and flushes them at once.
 * Merges intents with same recipientId+groupKey to avoid duplicates.
 *
 * Usage:
 *   const batch = new NotificationBatch()
 *   batch.add({ ... }) // status change
 *   batch.add({ ... }) // priority change
 *   await batch.flush() // sends 1 merged notification instead of 2
 */
export class NotificationBatch {
  private intents: NotificationIntent[] = []

  add(intent: NotificationIntent) {
    this.intents.push(intent)
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
  async flush() {
    if (this.intents.length === 0) return

    // Group by groupKey to merge intents with same key
    const byGroupKey = new Map<string, NotificationIntent[]>()
    const ungrouped: NotificationIntent[] = []

    for (const intent of this.intents) {
      if (intent.groupKey) {
        const key = intent.groupKey
        if (!byGroupKey.has(key)) byGroupKey.set(key, [])
        byGroupKey.get(key)!.push(intent)
      } else {
        ungrouped.push(intent)
      }
    }

    // Merge grouped intents
    for (const [, intents] of byGroupKey) {
      if (intents.length === 1) {
        await dispatchNotification(intents[0])
      } else {
        // Merge: combine recipients, use last message, merge metadata
        const merged = { ...intents[intents.length - 1] }
        const allRecipients = new Set<string>()
        for (const i of intents) {
          for (const r of i.recipientIds) allRecipients.add(r)
        }
        merged.recipientIds = Array.from(allRecipients)

        // Combine messages from different change types
        const messages = intents.map((i) => i.message)
        if (new Set(messages).size > 1) {
          // Different messages = different changes, combine them
          merged.message = messages.join('; ')
        }

        await dispatchNotification(merged)
      }
    }

    // Dispatch ungrouped as-is
    for (const intent of ungrouped) {
      await dispatchNotification(intent)
    }

    this.intents = []
  }
}

// ============================================================
// LEGACY API (kept for backward compatibility during migration)
// ============================================================

/**
 * @deprecated Use dispatchNotification instead
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

  const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } })
  sendBadgeUpdate(userId, { notifications: unreadCount })

  sendPush(userId, { title, message, link })

  return notification
}

/**
 * @deprecated Use dispatchNotification instead
 */
export async function notifyUsers(
  userIds: string[],
  excludeUserId: string | null,
  params: Omit<CreateNotificationParams, 'userId'>
) {
  const recipients = userIds.filter((id) => id !== excludeUserId)
  if (recipients.length === 0) return

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

// ============================================================
// HELPERS
// ============================================================

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
