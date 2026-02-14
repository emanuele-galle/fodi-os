import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission, requirePermission } from '@/lib/permissions'
import { slugify } from '@/lib/utils'
import { createChannelSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'chat', 'read')

    const channels = await prisma.chatChannel.findMany({
      where: {
        members: { some: { userId } },
        isArchived: false,
      },
      include: {
        _count: { select: { members: true } },
        members: {
          where: { userId },
          select: { lastReadAt: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          where: { deletedAt: null },
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const items = channels.map((ch) => {
      const lastMessage = ch.messages[0] || null
      const lastReadAt = ch.members[0]?.lastReadAt
      const hasUnread = lastMessage && lastReadAt
        ? new Date(lastMessage.createdAt) > new Date(lastReadAt)
        : !!lastMessage && !lastReadAt

      return {
        id: ch.id,
        name: ch.name,
        slug: ch.slug,
        description: ch.description,
        type: ch.type,
        memberCount: ch._count.members,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content.slice(0, 100),
              authorName: `${lastMessage.author.firstName} ${lastMessage.author.lastName}`,
              createdAt: lastMessage.createdAt,
            }
          : null,
        hasUnread,
        updatedAt: ch.updatedAt,
      }
    })

    // Sort: channels with unread first, then by latest message
    items.sort((a, b) => {
      if (a.hasUnread !== b.hasUnread) return a.hasUnread ? -1 : 1
      const aTime = a.lastMessage?.createdAt || a.updatedAt
      const bTime = b.lastMessage?.createdAt || b.updatedAt
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

    return NextResponse.json({ items })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[chat/channels]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'chat', 'write')

    const body = await request.json()
    const parsed = createChannelSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, description, type, projectId, memberIds } = parsed.data

    // PUBLIC/PRIVATE channels require admin permission
    if ((type === 'PUBLIC' || type === 'PRIVATE') && !hasPermission(role, 'chat', 'admin')) {
      return NextResponse.json(
        { error: 'Solo admin possono creare canali pubblici o privati' },
        { status: 403 }
      )
    }

    const slug = slugify(name)

    const channel = await prisma.chatChannel.create({
      data: {
        name,
        slug,
        description,
        type,
        projectId,
        createdById: userId,
        members: {
          create: [
            { userId, role: 'OWNER' },
            ...(memberIds || [])
              .filter((id) => id !== userId)
              .map((id) => ({ userId: id, role: 'MEMBER' as const })),
          ],
        },
      },
      include: {
        _count: { select: { members: true } },
      },
    })

    return NextResponse.json(channel, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[chat/channels]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
