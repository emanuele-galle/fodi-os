import { prisma } from '@/lib/prisma'
import type { AiToolDefinition, AiToolInput, AiToolContext } from '../types'

export const notificationTools: AiToolDefinition[] = [
  {
    name: 'list_notifications',
    description: 'Lista le notifiche dell\'utente, filtrabili per stato letto/non letto.',
    input_schema: {
      type: 'object',
      properties: {
        unreadOnly: { type: 'boolean', description: 'Se true, mostra solo non lette (default: false)' },
        limit: { type: 'number', description: 'Numero massimo risultati (default: 20)' },
      },
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const limit = Math.min(Number(input.limit) || 20, 50)
      const where: Record<string, unknown> = { userId: context.userId }
      if (input.unreadOnly) where.isRead = false

      const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            title: true,
            message: true,
            link: true,
            isRead: true,
            createdAt: true,
            project: { select: { id: true, name: true } },
          },
        }),
        prisma.notification.count({
          where: { userId: context.userId, isRead: false },
        }),
      ])

      return { success: true, data: { notifications, total: notifications.length, unreadCount } }
    },
  },

  {
    name: 'mark_notifications_read',
    description: 'Segna notifiche come lette. Senza ID segna tutte come lette.',
    input_schema: {
      type: 'object',
      properties: {
        notificationIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'ID specifici da segnare come letti (opzionale, senza = tutte)',
        },
      },
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const ids = input.notificationIds as string[] | undefined

      const result = await prisma.notification.updateMany({
        where: {
          userId: context.userId,
          isRead: false,
          ...(ids?.length ? { id: { in: ids } } : {}),
        },
        data: { isRead: true },
      })

      return { success: true, data: { markedRead: result.count } }
    },
  },
]
