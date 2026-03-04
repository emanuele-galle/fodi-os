import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Aggregated badge counts — replaces 3 separate fetches
 * (notifications, chat/channels, tasks/count) with a single request.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const [notificationCount, taskCount, chatCountResult] = await Promise.all([
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
      prisma.task.count({
        where: {
          assignments: { some: { userId } },
          status: { in: ['TODO', 'IN_PROGRESS'] },
        },
      }),
      // Single query for unread chat messages across all channels (replaces N+1)
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM "chat_messages" msg
        JOIN "chat_members" cm ON cm."channelId" = msg."channelId"
        JOIN "chat_channels" cc ON cc.id = cm."channelId"
        WHERE cm."userId" = ${userId} AND msg."deletedAt" IS NULL AND cc."isArchived" = false
          AND (cm."lastReadAt" IS NULL OR msg."createdAt" > cm."lastReadAt")
      `,
    ])
    const chatCount = Number(chatCountResult[0]?.count ?? 0)

    return NextResponse.json(
      { notifications: notificationCount, tasks: taskCount, chat: chatCount },
      { headers: { 'Cache-Control': 'no-cache' } }
    )
  } catch (error) {
    console.error('[dashboard/badges]', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
