import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalClient, handlePortalError } from '@/lib/portal-auth'
import { sseManager, sendBadgeUpdate } from '@/lib/sse'
import { dispatchNotification } from '@/lib/notifications'
import { sanitizeHtml } from '@/lib/utils'
import { z } from 'zod'

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Messaggio obbligatorio').max(5000),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

async function getClientChannel(clientId: string) {
  const slug = `client-${clientId}`
  return prisma.chatChannel.findUnique({
    where: { slug },
    select: { id: true, name: true },
  })
}

export async function GET(request: NextRequest) {
  try {
    const client = await requirePortalClient(request)
    const channel = await getClientChannel(client.id)
    if (!channel) {
      return NextResponse.json({ items: [], nextCursor: null, readStatus: {} })
    }

    const { searchParams } = request.nextUrl
    const cursor = searchParams.get('cursor')
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    let cursorDate: Date | undefined
    if (cursor) {
      const cursorMsg = await prisma.chatMessage.findUnique({ where: { id: cursor }, select: { createdAt: true } })
      if (cursorMsg) cursorDate = cursorMsg.createdAt
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        channelId: channel.id,
        deletedAt: null,
        ...(cursorDate && { createdAt: { lt: cursorDate } }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
        },
      },
    })

    const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null

    const members = await prisma.chatMember.findMany({
      where: { channelId: channel.id },
      select: {
        userId: true,
        lastReadAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
    })
    const readStatus: Record<string, { lastReadAt: string | null; name: string }> = {}
    for (const m of members) {
      readStatus[m.userId] = {
        lastReadAt: m.lastReadAt?.toISOString() || null,
        name: `${m.user.firstName} ${m.user.lastName}`,
      }
    }

    return NextResponse.json({
      items: messages.reverse(),
      nextCursor,
      readStatus,
    })
  } catch (e) {
    return handlePortalError(e, 'portal/chat/messages')
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await requirePortalClient(request)
    const channel = await getClientChannel(client.id)
    if (!channel) {
      return NextResponse.json({ error: 'Canale non trovato. Apri prima la chat.' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = sendMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const sanitizedContent = sanitizeHtml(parsed.data.content)

    const message = await prisma.chatMessage.create({
      data: {
        channelId: channel.id,
        authorId: client.userId,
        content: sanitizedContent,
        type: 'TEXT',
        metadata: (parsed.data.metadata as Record<string, string>) ?? undefined,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
        },
      },
    })

    // Update channel + mark as read for sender
    const now = new Date()
    await Promise.all([
      prisma.chatChannel.update({
        where: { id: channel.id },
        data: { updatedAt: now },
      }),
      prisma.chatMember.updateMany({
        where: { channelId: channel.id, userId: client.userId },
        data: { lastReadAt: now },
      }),
    ])

    // Broadcast to all channel members
    const members = await prisma.chatMember.findMany({
      where: { channelId: channel.id },
      select: { userId: true },
    })
    const memberUserIds = members.map((m) => m.userId)

    sseManager.broadcast(channel.id, memberUserIds, {
      type: 'new_message',
      data: message,
    })

    // Badge update + notification for other members
    const otherMembers = memberUserIds.filter((id) => id !== client.userId)
    for (const memberId of otherMembers) {
      const unreadMessages = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COALESCE(SUM(msg_count), 0) as count FROM (
          SELECT COUNT(msg.id) as msg_count
          FROM "chat_members" cm
          JOIN "chat_channels" cc ON cc.id = cm."channelId"
          LEFT JOIN "chat_messages" msg ON msg."channelId" = cc.id
            AND msg."deletedAt" IS NULL
            AND (cm."lastReadAt" IS NULL OR msg."createdAt" > cm."lastReadAt")
          WHERE cm."userId" = ${memberId}
            AND cc."isArchived" = false
          GROUP BY cc.id
        ) sub
      `
      sendBadgeUpdate(memberId, { chat: Number(unreadMessages[0]?.count ?? 0) })
    }

    // Dispatch notification to support team
    if (otherMembers.length > 0) {
      await dispatchNotification({
        type: 'chat_message',
        title: 'Messaggio dal cliente',
        message: `${client.companyName}: ${sanitizedContent.length > 80 ? sanitizedContent.slice(0, 80) + '...' : sanitizedContent}`,
        link: `/chat?channel=${channel.id}`,
        metadata: { clientName: client.companyName, channelId: channel.id },
        recipientIds: otherMembers,
        excludeUserId: client.userId,
        groupKey: `chat_client:${channel.id}`,
        actorName: client.companyName,
      })
    }

    return NextResponse.json(message, { status: 201 })
  } catch (e) {
    return handlePortalError(e, 'portal/chat/messages')
  }
}
