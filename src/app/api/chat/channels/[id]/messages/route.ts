import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createMessageSchema } from '@/lib/validation'
import { sseManager } from '@/lib/sse'
import { sendPush } from '@/lib/push'
import { sanitizeHtml } from '@/lib/utils'
import type { Role } from '@/generated/prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: channelId } = await params
    const userId = request.headers.get('x-user-id')!
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'chat', 'read')

    // Verify membership
    const membership = await prisma.chatMember.findFirst({
      where: { channelId, userId },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Non sei membro di questo canale' }, { status: 403 })
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
        channelId,
        deletedAt: null,
        ...(cursorDate && { createdAt: { lt: cursorDate } }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    })

    const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null

    // Fetch all members' lastReadAt for read receipts
    const members = await prisma.chatMember.findMany({
      where: { channelId },
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
      items: messages.reverse(), // chronological order
      nextCursor,
      readStatus,
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[chat/channels/:id/messages]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: channelId } = await params
    const userId = request.headers.get('x-user-id')!
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'chat', 'write')

    // Verify membership
    const membership = await prisma.chatMember.findFirst({
      where: { channelId, userId },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Non sei membro di questo canale' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const sanitizedContent = sanitizeHtml(parsed.data.content)

    const message = await prisma.chatMessage.create({
      data: {
        channelId,
        authorId: userId,
        content: sanitizedContent,
        type: parsed.data.type,
        metadata: parsed.data.metadata ?? undefined,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    })

    // Update channel timestamp + mark as read for sender
    const now = new Date()
    await Promise.all([
      prisma.chatChannel.update({
        where: { id: channelId },
        data: { updatedAt: now },
      }),
      prisma.chatMember.updateMany({
        where: { channelId, userId },
        data: { lastReadAt: now },
      }),
    ])

    // Get all channel member user IDs for SSE broadcast
    const members = await prisma.chatMember.findMany({
      where: { channelId },
      select: { userId: true },
    })
    const memberUserIds = members.map((m) => m.userId)

    // Broadcast via SSE
    sseManager.broadcast(channelId, memberUserIds, {
      type: 'new_message',
      data: message,
    })

    // Push notification for offline members (no active SSE connection)
    const offlineMembers = memberUserIds.filter(
      (id) => id !== userId && !sseManager.isUserConnected(id)
    )
    if (offlineMembers.length > 0) {
      const authorName = `${message.author.firstName} ${message.author.lastName}`
      for (const memberId of offlineMembers) {
        sendPush(memberId, {
          title: `Nuovo messaggio da ${authorName}`,
          message: sanitizedContent.length > 100 ? sanitizedContent.slice(0, 100) + '...' : sanitizedContent,
          link: `/chat?channel=${channelId}`,
        })
      }
    }

    // Check for @mentions and create notifications
    const mentionRegex = /@(\w+)/g
    const mentions = [...sanitizedContent.matchAll(mentionRegex)]
    if (mentions.length > 0) {
      const mentionedNames = mentions.map((m) => m[1].toLowerCase())
      const mentionedUsers = await prisma.user.findMany({
        where: {
          firstName: { in: mentionedNames, mode: 'insensitive' },
          id: { in: memberUserIds, not: userId },
        },
        select: { id: true },
      })

      if (mentionedUsers.length > 0) {
        const author = message.author
        const mentionNotifs = mentionedUsers.map((u) => ({
          userId: u.id,
          type: 'MENTION',
          title: 'Menzione in chat',
          message: `${author.firstName} ${author.lastName} ti ha menzionato in un messaggio`,
          link: `/chat?channel=${channelId}`,
        }))
        await prisma.notification.createMany({ data: mentionNotifs })
        for (const nd of mentionNotifs) {
          sseManager.sendToUser(nd.userId, {
            type: 'notification',
            data: { type: nd.type, title: nd.title, message: nd.message, link: nd.link },
          })
          sendPush(nd.userId, { title: nd.title, message: nd.message, link: nd.link })
        }
      }
    }

    return NextResponse.json(message, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[chat/channels/:id/messages]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
