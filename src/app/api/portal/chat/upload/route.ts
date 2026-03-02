import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalClient, handlePortalError } from '@/lib/portal-auth'
import { uploadFile } from '@/lib/s3'
import { validateFile } from '@/lib/file-validation'
import { sseManager, sendBadgeUpdate } from '@/lib/sse'

export async function POST(request: NextRequest) {
  try {
    const client = await requirePortalClient(request)
    const slug = `client-${client.id}`

    const channel = await prisma.chatChannel.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!channel) {
      return NextResponse.json({ error: 'Canale non trovato' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'File obbligatorio' }, { status: 400 })
    }

    const safeName = file.name.replace(/[\/\\:*?"<>|]/g, '_').replace(/\.{2,}/g, '.')
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()

    const buffer = Buffer.from(await file.arrayBuffer())

    const validationError = validateFile(safeName, file.size, file.type || 'application/octet-stream', buffer)
    if (validationError) {
      return NextResponse.json({ error: validationError.message }, { status: 400 })
    }

    const key = `chat/${channel.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
    const fileUrl = await uploadFile(key, buffer, file.type)

    const message = await prisma.chatMessage.create({
      data: {
        channelId: channel.id,
        authorId: client.userId,
        content: safeName,
        type: 'FILE_LINK',
        metadata: {
          fileName: safeName,
          fileUrl,
          fileSize: file.size,
          mimeType: file.type,
        },
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
        },
      },
    })

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

    const members = await prisma.chatMember.findMany({
      where: { channelId: channel.id },
      select: { userId: true },
    })
    const memberUserIds = members.map((m) => m.userId)

    sseManager.broadcast(channel.id, memberUserIds, {
      type: 'new_message',
      data: message,
    })

    // Badge update for other members
    for (const memberId of memberUserIds.filter((id) => id !== client.userId)) {
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

    return NextResponse.json(message, { status: 201 })
  } catch (e) {
    return handlePortalError(e, 'portal/chat/upload')
  }
}
