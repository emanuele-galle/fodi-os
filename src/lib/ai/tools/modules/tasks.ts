import { prisma } from '@/lib/prisma'
import type { AiToolDefinition, AiToolInput, AiToolContext } from '../types'

export const taskTools: AiToolDefinition[] = [
  {
    name: 'list_tasks',
    description: 'Lista i task filtrabili per stato, priorità, assegnatario. Restituisce titolo, stato, priorità, assegnatario, scadenza.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filtra per stato: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED' },
        priority: { type: 'string', description: 'Filtra per priorità: LOW, MEDIUM, HIGH, URGENT' },
        assigneeId: { type: 'string', description: 'Filtra per ID assegnatario' },
        mine: { type: 'boolean', description: 'Se true, mostra solo i task dell\'utente corrente' },
        limit: { type: 'number', description: 'Numero massimo di risultati (default: 20, max: 50)' },
      },
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const limit = Math.min(Number(input.limit) || 20, 50)
      const where: Record<string, unknown> = { parentId: null }

      if (input.status) where.status = input.status
      if (input.priority) where.priority = input.priority
      if (input.assigneeId) {
        where.OR = [
          { assigneeId: input.assigneeId as string },
          { assignments: { some: { userId: input.assigneeId as string } } },
        ]
      }
      if (input.mine) {
        where.OR = [
          { creatorId: context.userId },
          { assigneeId: context.userId },
          { assignments: { some: { userId: context.userId } } },
        ]
      }

      const tasks = await prisma.task.findMany({
        where,
        take: limit,
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          assignee: { select: { id: true, firstName: true, lastName: true } },
          project: { select: { id: true, name: true } },
          _count: { select: { comments: true, subtasks: true } },
        },
      })

      return { success: true, data: { tasks, total: tasks.length } }
    },
  },

  {
    name: 'create_task',
    description: 'Crea un nuovo task con titolo, descrizione, priorità, assegnatario e scadenza.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titolo del task (obbligatorio)' },
        description: { type: 'string', description: 'Descrizione dettagliata' },
        priority: { type: 'string', description: 'Priorità: LOW, MEDIUM, HIGH, URGENT (default: MEDIUM)' },
        assigneeId: { type: 'string', description: 'ID utente assegnatario' },
        projectId: { type: 'string', description: 'ID progetto' },
        dueDate: { type: 'string', description: 'Data scadenza (ISO 8601)' },
      },
      required: ['title'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const task = await prisma.task.create({
        data: {
          title: input.title as string,
          description: (input.description as string) || null,
          priority: (input.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') || 'MEDIUM',
          assigneeId: (input.assigneeId as string) || context.userId,
          creatorId: context.userId,
          projectId: (input.projectId as string) || null,
          dueDate: input.dueDate ? new Date(input.dueDate as string) : null,
          isPersonal: !input.projectId,
        },
      })

      // Create assignment
      await prisma.taskAssignment.create({
        data: {
          taskId: task.id,
          userId: (input.assigneeId as string) || context.userId,
          role: 'assignee',
          assignedBy: context.userId,
        },
      })

      return { success: true, data: { id: task.id, title: task.title, status: task.status } }
    },
  },

  {
    name: 'update_task',
    description: 'Aggiorna un task esistente (stato, priorità, assegnatario, scadenza).',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID del task da aggiornare (obbligatorio)' },
        status: { type: 'string', description: 'Nuovo stato: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED' },
        priority: { type: 'string', description: 'Nuova priorità: LOW, MEDIUM, HIGH, URGENT' },
        assigneeId: { type: 'string', description: 'Nuovo assegnatario (ID utente)' },
        dueDate: { type: 'string', description: 'Nuova scadenza (ISO 8601)' },
        title: { type: 'string', description: 'Nuovo titolo' },
      },
      required: ['taskId'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const data: Record<string, unknown> = {}
      if (input.status) data.status = input.status
      if (input.priority) data.priority = input.priority
      if (input.assigneeId) data.assigneeId = input.assigneeId
      if (input.dueDate) data.dueDate = new Date(input.dueDate as string)
      if (input.title) data.title = input.title
      if (input.status === 'DONE') data.completedAt = new Date()

      const task = await prisma.task.update({
        where: { id: input.taskId as string },
        data,
        select: { id: true, title: true, status: true, priority: true },
      })

      return { success: true, data: task }
    },
  },

  {
    name: 'get_task_details',
    description: 'Ottieni tutti i dettagli di un task specifico, inclusi commenti, sotto-task e time entries.',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID del task (obbligatorio)' },
      },
      required: ['taskId'],
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const task = await prisma.task.findUnique({
        where: { id: input.taskId as string },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
          project: { select: { id: true, name: true } },
          assignments: {
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
          },
          comments: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              content: true,
              createdAt: true,
              author: { select: { firstName: true, lastName: true } },
            },
          },
          subtasks: {
            select: { id: true, title: true, status: true, priority: true },
          },
          _count: { select: { timeEntries: true } },
        },
      })

      if (!task) return { success: false, error: 'Task non trovato' }
      return { success: true, data: task }
    },
  },
]
