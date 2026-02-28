import { prisma } from '@/lib/prisma'
import { sseManager, sendBadgeUpdate } from '@/lib/sse'
import { sendPush } from '@/lib/push'
import { sanitizeHtml } from '@/lib/utils'
import type { AiToolDefinition, AiToolInput, AiToolContext } from '../types'

export const chatTools: AiToolDefinition[] = [
  {
    name: 'list_chat_channels',
    description: 'Lista i canali chat di cui l\'utente è membro, con ultimo messaggio e conteggio non letti.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Filtra per tipo: PUBLIC, PRIVATE, DIRECT, PROJECT' },
        limit: { type: 'number', description: 'Numero massimo di risultati (default: 20)' },
      },
    },
    module: 'chat',
    requiredPermission: 'read',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const limit = Math.min(Number(input.limit) || 20, 50)
      const where: Record<string, unknown> = {
        members: { some: { userId: context.userId } },
        isArchived: false,
      }
      if (input.type) where.type = input.type

      const channels = await prisma.chatChannel.findMany({
        where,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { members: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            where: { deletedAt: null },
            select: {
              content: true,
              createdAt: true,
              author: { select: { firstName: true, lastName: true } },
            },
          },
        },
      })

      const items = channels.map((ch) => {
        const lastMsg = ch.messages[0]
        return {
          id: ch.id,
          name: ch.name,
          type: ch.type,
          memberCount: ch._count.members,
          lastMessage: lastMsg ? {
            content: lastMsg.content.slice(0, 100),
            author: `${lastMsg.author.firstName} ${lastMsg.author.lastName}`,
            createdAt: lastMsg.createdAt,
          } : null,
        }
      })

      return { success: true, data: { channels: items, total: items.length } }
    },
  },

  {
    name: 'send_chat_message',
    description: 'Invia un messaggio in un canale chat. L\'utente deve essere membro del canale.',
    input_schema: {
      type: 'object',
      properties: {
        channelId: { type: 'string', description: 'ID del canale chat (obbligatorio)' },
        content: { type: 'string', description: 'Testo del messaggio (obbligatorio)' },
      },
      required: ['channelId', 'content'],
    },
    module: 'chat',
    requiredPermission: 'write',
    // eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const channelId = input.channelId as string
      const content = sanitizeHtml(input.content as string)

      // Verify membership
      const membership = await prisma.chatMember.findFirst({
        where: { channelId, userId: context.userId },
      })
      if (!membership) {
        // Auto-join if public channel
        const channel = await prisma.chatChannel.findUnique({ where: { id: channelId }, select: { type: true } })
        if (channel?.type === 'PUBLIC') {
          await prisma.chatMember.create({ data: { channelId, userId: context.userId } })
        } else {
          return { success: false, error: 'Non sei membro di questo canale' }
        }
      }

      const message = await prisma.chatMessage.create({
        data: {
          channelId,
          authorId: context.userId,
          content,
          type: 'TEXT',
        },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      })

      // Update channel timestamp + mark read for sender
      const now = new Date()
      await Promise.all([
        prisma.chatChannel.update({ where: { id: channelId }, data: { updatedAt: now } }),
        prisma.chatMember.updateMany({ where: { channelId, userId: context.userId }, data: { lastReadAt: now } }),
      ])

      // SSE broadcast to all channel members
      const members = await prisma.chatMember.findMany({
        where: { channelId },
        select: { userId: true },
      })
      const memberUserIds = members.map((m) => m.userId)

      sseManager.broadcast(channelId, memberUserIds, {
        type: 'new_message',
        data: message,
      })

      // Badge update for other members
      for (const memberId of memberUserIds.filter((id) => id !== context.userId)) {
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

      // Push for offline members
      const offlineMembers = memberUserIds.filter(
        (id) => id !== context.userId && !sseManager.isUserConnected(id)
      )
      if (offlineMembers.length > 0) {
        const authorName = `${message.author.firstName} ${message.author.lastName}`
        for (const memberId of offlineMembers) {
          sendPush(memberId, {
            title: `Nuovo messaggio da ${authorName}`,
            message: content.length > 100 ? content.slice(0, 100) + '...' : content,
            link: `/chat?channel=${channelId}`,
          })
        }
      }

      return { success: true, data: { id: message.id, channelId, content: message.content, createdAt: message.createdAt } }
    },
  },

  {
    name: 'send_direct_message',
    description: 'Invia un messaggio diretto a un utente. Crea il canale DM se non esiste.',
    input_schema: {
      type: 'object',
      properties: {
        targetUserId: { type: 'string', description: 'ID dell\'utente destinatario (obbligatorio)' },
        content: { type: 'string', description: 'Testo del messaggio (obbligatorio)' },
      },
      required: ['targetUserId', 'content'],
    },
    module: 'chat',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const targetUserId = input.targetUserId as string
      const content = sanitizeHtml(input.content as string)

      if (targetUserId === context.userId) {
        return { success: false, error: 'Non puoi inviare un DM a te stesso' }
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, firstName: true, lastName: true },
      })
      if (!targetUser) return { success: false, error: 'Utente non trovato' }

      // Find or create DM channel
      let channel = await prisma.chatChannel.findFirst({
        where: {
          type: 'DIRECT',
          isArchived: false,
          AND: [
            { members: { some: { userId: context.userId } } },
            { members: { some: { userId: targetUserId } } },
          ],
          members: { every: { userId: { in: [context.userId, targetUserId] } } },
        },
        include: { _count: { select: { members: true } } },
      })

      if (!channel || channel._count.members !== 2) {
        const currentUser = await prisma.user.findUnique({
          where: { id: context.userId },
          select: { firstName: true, lastName: true },
        })
        const channelName = `${currentUser?.firstName || ''} & ${targetUser.firstName}`
        const slug = `dm-${[context.userId, targetUserId].sort().join('-').slice(0, 50)}`
        const existingSlug = await prisma.chatChannel.findUnique({ where: { slug } })
        const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug

        channel = await prisma.chatChannel.create({
          data: {
            name: channelName,
            slug: finalSlug,
            type: 'DIRECT',
            createdById: context.userId,
            members: {
              create: [
                { userId: context.userId, role: 'OWNER' },
                { userId: targetUserId, role: 'MEMBER' },
              ],
            },
          },
          include: { _count: { select: { members: true } } },
        })
      }

      // Send the message
      const message = await prisma.chatMessage.create({
        data: {
          channelId: channel.id,
          authorId: context.userId,
          content,
          type: 'TEXT',
        },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      })

      const now = new Date()
      await Promise.all([
        prisma.chatChannel.update({ where: { id: channel.id }, data: { updatedAt: now } }),
        prisma.chatMember.updateMany({ where: { channelId: channel.id, userId: context.userId }, data: { lastReadAt: now } }),
      ])

      // SSE + push to target
      sseManager.broadcast(channel.id, [context.userId, targetUserId], {
        type: 'new_message',
        data: message,
      })

      if (!sseManager.isUserConnected(targetUserId)) {
        const authorName = `${message.author.firstName} ${message.author.lastName}`
        sendPush(targetUserId, {
          title: `Messaggio da ${authorName}`,
          message: content.length > 100 ? content.slice(0, 100) + '...' : content,
          link: `/chat?channel=${channel.id}`,
        })
      }

      // Badge update for target
      const unreadMessages = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COALESCE(SUM(msg_count), 0) as count FROM (
          SELECT COUNT(msg.id) as msg_count
          FROM "chat_members" cm
          JOIN "chat_channels" cc ON cc.id = cm."channelId"
          LEFT JOIN "chat_messages" msg ON msg."channelId" = cc.id
            AND msg."deletedAt" IS NULL
            AND (cm."lastReadAt" IS NULL OR msg."createdAt" > cm."lastReadAt")
          WHERE cm."userId" = ${targetUserId}
            AND cc."isArchived" = false
          GROUP BY cc.id
        ) sub
      `
      sendBadgeUpdate(targetUserId, { chat: Number(unreadMessages[0]?.count ?? 0) })

      return { success: true, data: { id: message.id, channelId: channel.id, targetUser: `${targetUser.firstName} ${targetUser.lastName}`, content: message.content } }
    },
  },

  {
    name: 'search_chat_messages',
    description: 'Cerca messaggi nei canali chat per parola chiave.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Testo da cercare (obbligatorio)' },
        channelId: { type: 'string', description: 'Filtra per canale specifico' },
        limit: { type: 'number', description: 'Numero massimo risultati (default: 20)' },
      },
      required: ['query'],
    },
    module: 'chat',
    requiredPermission: 'read',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const limit = Math.min(Number(input.limit) || 20, 50)
      const query = input.query as string

      // Only search in channels the user is a member of
      const memberChannels = await prisma.chatMember.findMany({
        where: { userId: context.userId },
        select: { channelId: true },
      })
      const channelIds = memberChannels.map((m) => m.channelId)

      const where: Record<string, unknown> = {
        channelId: input.channelId ? { equals: input.channelId, in: channelIds } : { in: channelIds },
        content: { contains: query, mode: 'insensitive' },
        deletedAt: null,
      }

      const messages = await prisma.chatMessage.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          content: true,
          createdAt: true,
          channel: { select: { id: true, name: true } },
          author: { select: { firstName: true, lastName: true } },
        },
      })

      return { success: true, data: { messages, total: messages.length } }
    },
  },

  {
    name: 'list_team_members',
    description: 'Lista tutti i membri del team con ID, nome, ruolo e stato attivo. Utile per trovare l\'ID di un utente.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Cerca per nome o cognome' },
        role: { type: 'string', description: 'Filtra per ruolo: ADMIN, STAFF, COLLABORATOR' },
      },
    },
    module: 'chat',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const where: Record<string, unknown> = { isActive: true }

      if (input.search) {
        const search = input.search as string
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      }
      if (input.role) where.role = input.role

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          jobTitle: true,
        },
        orderBy: { firstName: 'asc' },
        take: 50,
      })

      return { success: true, data: { members: users, total: users.length } }
    },
  },

  {
    name: 'send_notification',
    description: 'Invia una notifica in-app a uno o più utenti con titolo, messaggio e link opzionale.',
    input_schema: {
      type: 'object',
      properties: {
        userIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista di ID utenti destinatari (obbligatorio)',
        },
        title: { type: 'string', description: 'Titolo della notifica (obbligatorio)' },
        message: { type: 'string', description: 'Messaggio della notifica (obbligatorio)' },
        link: { type: 'string', description: 'Link opzionale (es. /tasks?taskId=xxx)' },
        type: { type: 'string', description: 'Tipo notifica (default: ai_notification)' },
      },
      required: ['userIds', 'title', 'message'],
    },
    module: 'chat',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const { dispatchNotification: dispatch } = await import('@/lib/notifications')
      const userIds = input.userIds as string[]

      const actor = await prisma.user.findUnique({
        where: { id: context.userId },
        select: { firstName: true, lastName: true },
      })
      const actorName = actor ? `${actor.firstName} ${actor.lastName}` : 'Assistente AI'

      await dispatch({
        type: (input.type as string) || 'ai_notification',
        title: input.title as string,
        message: input.message as string,
        link: (input.link as string) || undefined,
        actorName,
        recipientIds: userIds,
        excludeUserId: null,
      })

      return { success: true, data: { notified: userIds.length } }
    },
  },
]
