import { prisma } from '@/lib/prisma'
import type { AiToolDefinition, AiToolInput, AiToolContext } from '../types'

export const timeTools: AiToolDefinition[] = [
  {
    name: 'list_time_entries',
    description: 'Lista le registrazioni di tempo filtrabili per utente, task, periodo e fatturabilità. Restituisce ore, descrizione, utente e task associato.',
    input_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Filtra per ID utente' },
        taskId: { type: 'string', description: 'Filtra per ID task' },
        startDate: { type: 'string', description: 'Data inizio periodo (ISO 8601)' },
        endDate: { type: 'string', description: 'Data fine periodo (ISO 8601)' },
        billable: { type: 'boolean', description: 'Filtra per fatturabilità (true/false)' },
        limit: { type: 'number', description: 'Numero massimo di risultati (default: 20, max: 50)' },
      },
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const limit = Math.min(Number(input.limit) || 20, 50)
      const where: Record<string, unknown> = {}

      if (input.userId) where.userId = input.userId
      if (input.taskId) where.taskId = input.taskId
      if (typeof input.billable === 'boolean') where.billable = input.billable
      if (input.startDate || input.endDate) {
        where.date = {}
        if (input.startDate) (where.date as Record<string, unknown>).gte = new Date(input.startDate as string)
        if (input.endDate) (where.date as Record<string, unknown>).lte = new Date(input.endDate as string)
      }

      const entries = await prisma.timeEntry.findMany({
        where,
        take: limit,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          date: true,
          hours: true,
          description: true,
          billable: true,
          hourlyRate: true,
          user: { select: { firstName: true, lastName: true } },
          task: {
            select: {
              id: true,
              title: true,
              project: { select: { id: true, name: true } },
            },
          },
        },
      })

      return { success: true, data: { entries, total: entries.length } }
    },
  },

  {
    name: 'log_time',
    description: 'Registra ore lavorate su un task o progetto. Specifica data, ore, descrizione e se fatturabile.',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID del task (opzionale)' },
        date: { type: 'string', description: 'Data della registrazione (ISO 8601, obbligatorio)' },
        hours: { type: 'number', description: 'Ore lavorate (obbligatorio, maggiore di 0, massimo 24)' },
        description: { type: 'string', description: 'Descrizione del lavoro svolto' },
        billable: { type: 'boolean', description: 'Se fatturabile (default: true)' },
      },
      required: ['date', 'hours'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const hours = Number(input.hours)
      if (!hours || hours <= 0 || hours > 24) {
        return { success: false, error: 'Le ore devono essere un numero maggiore di 0 e non superiore a 24' }
      }

      // If taskId provided, resolve projectId from the task
      let projectId: string | null = null
      if (input.taskId) {
        const task = await prisma.task.findUnique({
          where: { id: input.taskId as string },
          select: { projectId: true },
        })
        if (!task) return { success: false, error: 'Task non trovato' }
        projectId = task.projectId
      }

      const entry = await prisma.timeEntry.create({
        data: {
          userId: context.userId,
          taskId: (input.taskId as string) || null,
          projectId,
          date: new Date(input.date as string),
          hours,
          description: (input.description as string) || null,
          billable: typeof input.billable === 'boolean' ? input.billable : true,
        },
        select: {
          id: true,
          date: true,
          hours: true,
          description: true,
          billable: true,
          task: { select: { id: true, title: true } },
        },
      })

      return { success: true, data: entry }
    },
  },

  {
    name: 'get_time_summary',
    description: 'Ottieni un riepilogo delle ore registrate raggruppate per utente, progetto o task. Mostra ore totali, fatturabili e non fatturabili.',
    input_schema: {
      type: 'object',
      properties: {
        groupBy: { type: 'string', description: 'Raggruppamento: user, project, task (obbligatorio)' },
        startDate: { type: 'string', description: 'Data inizio periodo (ISO 8601, obbligatorio)' },
        endDate: { type: 'string', description: 'Data fine periodo (ISO 8601, obbligatorio)' },
      },
      required: ['groupBy', 'startDate', 'endDate'],
    },
    module: 'pm',
    requiredPermission: 'read',
    // eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
    execute: async (input: AiToolInput) => {
      const groupBy = input.groupBy as 'user' | 'project' | 'task'
      const startDate = new Date(input.startDate as string)
      const endDate = new Date(input.endDate as string)

      const where = {
        date: { gte: startDate, lte: endDate },
      }

      if (groupBy === 'user') {
        const entries = await prisma.timeEntry.findMany({
          where,
          select: {
            hours: true,
            billable: true,
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        })

        const grouped = new Map<string, { id: string; name: string; totalHours: number; billableHours: number; nonBillableHours: number; entryCount: number }>()
        for (const e of entries) {
          const key = e.user.id ?? 'unknown'
          const existing = grouped.get(key) || { id: key, name: `${e.user.firstName} ${e.user.lastName}`, totalHours: 0, billableHours: 0, nonBillableHours: 0, entryCount: 0 }
          existing.totalHours += e.hours
          if (e.billable) existing.billableHours += e.hours
          else existing.nonBillableHours += e.hours
          existing.entryCount++
          grouped.set(key, existing)
        }

        return { success: true, data: { groupBy, period: { startDate, endDate }, groups: Array.from(grouped.values()) } }
      }

      if (groupBy === 'project') {
        const entries = await prisma.timeEntry.findMany({
          where,
          select: {
            hours: true,
            billable: true,
            projectId: true,
            task: { select: { project: { select: { id: true, name: true } } } },
          },
        })

        const grouped = new Map<string, { id: string; name: string; totalHours: number; billableHours: number; nonBillableHours: number; entryCount: number }>()
        for (const e of entries) {
          const proj = e.task?.project
          const key = proj?.id || e.projectId || 'no-project'
          const name = proj?.name || 'Senza progetto'
          const existing = grouped.get(key) || { id: key, name, totalHours: 0, billableHours: 0, nonBillableHours: 0, entryCount: 0 }
          existing.totalHours += e.hours
          if (e.billable) existing.billableHours += e.hours
          else existing.nonBillableHours += e.hours
          existing.entryCount++
          grouped.set(key, existing)
        }

        return { success: true, data: { groupBy, period: { startDate, endDate }, groups: Array.from(grouped.values()) } }
      }

      if (groupBy === 'task') {
        const entries = await prisma.timeEntry.findMany({
          where,
          select: {
            hours: true,
            billable: true,
            task: { select: { id: true, title: true } },
          },
        })

        const grouped = new Map<string, { id: string; name: string; totalHours: number; billableHours: number; nonBillableHours: number; entryCount: number }>()
        for (const e of entries) {
          const key = e.task?.id || 'no-task'
          const name = e.task?.title || 'Senza task'
          const existing = grouped.get(key) || { id: key, name, totalHours: 0, billableHours: 0, nonBillableHours: 0, entryCount: 0 }
          existing.totalHours += e.hours
          if (e.billable) existing.billableHours += e.hours
          else existing.nonBillableHours += e.hours
          existing.entryCount++
          grouped.set(key, existing)
        }

        return { success: true, data: { groupBy, period: { startDate, endDate }, groups: Array.from(grouped.values()) } }
      }

      return { success: false, error: 'groupBy deve essere: user, project o task' }
    },
  },
]
