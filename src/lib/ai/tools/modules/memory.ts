import { prisma } from '@/lib/prisma'
import type { AiToolDefinition, AiToolInput, AiToolContext } from '../types'

export const memoryTools: AiToolDefinition[] = [
  {
    name: 'save_user_preference',
    description: 'Salva una preferenza o regola dell\'utente che persiste tra conversazioni. Usa chiavi descrittive (es. "stile_risposte", "progetto_default", "lingua_report").',
    input_schema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Chiave della preferenza (es. "stile_risposte", "progetto_default")' },
        value: { type: 'string', description: 'Valore della preferenza' },
      },
      required: ['key', 'value'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const pref = await prisma.aiUserPreference.upsert({
        where: {
          userId_key: {
            userId: context.userId,
            key: input.key as string,
          },
        },
        update: {
          value: input.value as string,
        },
        create: {
          userId: context.userId,
          key: input.key as string,
          value: input.value as string,
        },
        select: { id: true, key: true, value: true, updatedAt: true },
      })

      return { success: true, data: pref }
    },
  },

  {
    name: 'get_user_preferences',
    description: 'Recupera le preferenze salvate dell\'utente. Senza parametri restituisce tutte, con "key" restituisce quella specifica.',
    input_schema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Chiave specifica da recuperare (opzionale, senza = tutte)' },
      },
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      if (input.key) {
        const pref = await prisma.aiUserPreference.findUnique({
          where: {
            userId_key: {
              userId: context.userId,
              key: input.key as string,
            },
          },
          select: { key: true, value: true, updatedAt: true },
        })
        if (!pref) {
          return { success: false, error: `Nessuna preferenza trovata con chiave "${input.key}"` }
        }
        return { success: true, data: pref }
      }

      const prefs = await prisma.aiUserPreference.findMany({
        where: { userId: context.userId },
        orderBy: { updatedAt: 'desc' },
        select: { key: true, value: true, updatedAt: true },
      })

      return { success: true, data: { preferences: prefs, total: prefs.length } }
    },
  },

  {
    name: 'delete_user_preference',
    description: 'Elimina una preferenza salvata dell\'utente.',
    input_schema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Chiave della preferenza da eliminare (obbligatorio)' },
      },
      required: ['key'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      try {
        await prisma.aiUserPreference.delete({
          where: {
            userId_key: {
              userId: context.userId,
              key: input.key as string,
            },
          },
        })
        return { success: true, data: { deleted: input.key } }
      } catch {
        return { success: false, error: `Nessuna preferenza trovata con chiave "${input.key}"` }
      }
    },
  },
]
