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

    const [notificationCount, taskCount, chatChannels] = await Promise.all([
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
      prisma.task.count({
        where: {
          assignments: { some: { userId } },
          status: { in: ['TODO', 'IN_PROGRESS'] },
        },
      }),
      prisma.chatChannel.findMany({
        where: {
          members: { some: { userId } },
          isArchived: false,
        },
        select: {
          id: true,
          members: {
            where: { userId },
            select: { lastReadAt: true },
          },
        },
      }),
    ])

    // Count total unread chat messages across all channels
    const unreadChatCounts = await Promise.all(
      chatChannels.map((ch) => {
        const lastReadAt = ch.members[0]?.lastReadAt
        return prisma.chatMessage.count({
          where: {
            channelId: ch.id,
            deletedAt: null,
            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
          },
        })
      })
    )
    const chatCount = unreadChatCounts.reduce((sum, c) => sum + c, 0)

    return NextResponse.json(
      { notifications: notificationCount, tasks: taskCount, chat: chatCount },
      { headers: { 'Cache-Control': 'no-cache' } }
    )
  } catch (error) {
    console.error('[dashboard/badges]', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
