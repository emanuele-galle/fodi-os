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

  // --- update_notification_preferences ---
  {
    name: 'update_notification_preferences',
    description: 'Aggiorna le preferenze di notifica dell\'utente (abilita/disabilita per tipo e canale)',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Tipo notifica (es. task_assigned, deal_update, calendar_reminder)' },
        channel: { type: 'string', description: 'Canale: in_app, email, push (default: in_app)' },
        enabled: { type: 'boolean', description: 'Abilitata o disabilitata' },
      },
      required: ['type', 'enabled'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input, context) => {
      const channel = (input.channel as string) || 'in_app'
      const pref = await prisma.notificationPreference.upsert({
        where: {
          userId_type_channel: {
            userId: context.userId,
            type: input.type as string,
            channel,
          },
        },
        update: { enabled: input.enabled as boolean },
        create: {
          userId: context.userId,
          type: input.type as string,
          channel,
          enabled: input.enabled as boolean,
        },
        select: { id: true, type: true, channel: true, enabled: true },
      })
      return { success: true, data: pref }
    },
  },
]
