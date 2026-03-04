import { prisma } from '@/lib/prisma'
import { sendBadgeUpdate } from '@/lib/sse'

/**
 * Get unread message counts for multiple users in a single query,
 * then send badge updates via SSE.
 */
export async function sendUnreadBadgeUpdates(memberUserIds: string[], excludeUserId: string) {
  const otherMembers = memberUserIds.filter((id) => id !== excludeUserId)
  if (otherMembers.length === 0) return

  const counts = await prisma.$queryRaw<{ userId: string; count: bigint }[]>`
    SELECT cm."userId", COALESCE(SUM(msg_count), 0) as count FROM (
      SELECT cm2."userId", cm2."channelId", COUNT(msg.id) as msg_count
      FROM "chat_members" cm2
      JOIN "chat_channels" cc ON cc.id = cm2."channelId"
      LEFT JOIN "chat_messages" msg ON msg."channelId" = cc.id
        AND msg."deletedAt" IS NULL
        AND (cm2."lastReadAt" IS NULL OR msg."createdAt" > cm2."lastReadAt")
      WHERE cm2."userId" = ANY(${otherMembers})
        AND cc."isArchived" = false
      GROUP BY cm2."userId", cm2."channelId"
    ) sub
    JOIN "chat_members" cm ON cm."userId" = sub."userId" AND cm."channelId" = sub."channelId"
    GROUP BY cm."userId"
  `

  const countMap = new Map(counts.map((c) => [c.userId, Number(c.count)]))
  for (const memberId of otherMembers) {
    sendBadgeUpdate(memberId, { chat: countMap.get(memberId) ?? 0 })
  }
}
