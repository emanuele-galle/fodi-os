/* eslint-disable sonarjs/no-duplicate-string -- JSON schema property types are repeated by design */
import type { Priority } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { getTaskParticipants, dispatchNotification } from '@/lib/notifications'
import type { AiToolDefinition, AiToolInput, AiToolContext } from '../types'

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

function buildTaskUpdateData(input: AiToolInput): Record<string, unknown> | { success: false; error: string } {
  if (input.dueDate) {
    const parsed = parseDate(input.dueDate)
    if (!parsed) return { success: false, error: 'Data non valida' }
  }
  const data: Record<string, unknown> = {}
  if (input.status) data.status = input.status
  if (input.priority) data.priority = input.priority
  if (input.assigneeId) data.assigneeId = input.assigneeId
  if (input.dueDate) data.dueDate = parseDate(input.dueDate)
  if (input.title) data.title = input.title
  if (input.description !== undefined) data.description = input.description
  if (input.folderId !== undefined) data.folderId = input.folderId || null
  if (input.status === 'DONE') data.completedAt = new Date()
  return data
}

async function notifyTaskUpdate(
  taskId: string,
  input: AiToolInput,
  task: { title: string; projectId: string | null },
  context: AiToolContext,
) {
  const changes: string[] = []
  if (input.status) changes.push(`stato → ${input.status}`)
  if (input.priority) changes.push(`priorità → ${input.priority}`)
  if (input.assigneeId) changes.push('riassegnato')
  if (input.folderId !== undefined) changes.push('spostato in cartella')
  if (changes.length === 0) return

  const recipients = await getTaskParticipants(taskId)
  const actor = await prisma.user.findUnique({
    where: { id: context.userId },
    select: { firstName: true, lastName: true },
  })
  const actorName = actor ? `${actor.firstName} ${actor.lastName}` : 'Assistente AI'

  await dispatchNotification({
    type: 'task_updated',
    title: 'Task aggiornato',
    message: `${actorName} ha aggiornato "${task.title}": ${changes.join(', ')}`,
    link: `/tasks?taskId=${taskId}`,
    projectId: task.projectId ?? undefined,
    groupKey: `task_update:${taskId}`,
    actorName,
    recipientIds: recipients,
    excludeUserId: context.userId,
  })
}

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
        projectId: { type: 'string', description: 'Filtra per ID progetto' },
        folderId: { type: 'string', description: 'Filtra per ID cartella' },
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
      if (input.projectId) where.projectId = input.projectId
      if (input.folderId) where.folderId = input.folderId
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
          folderId: true,
          assignee: { select: { id: true, firstName: true, lastName: true } },
          project: { select: { id: true, name: true } },
          folder: { select: { id: true, name: true } },
          _count: { select: { comments: true, subtasks: true } },
        },
      })

      return { success: true, data: { tasks, total: tasks.length } }
    },
  },

  {
    name: 'create_task',
    description: 'Crea un nuovo task con titolo, descrizione, priorità, assegnatario, scadenza e cartella.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titolo del task (obbligatorio)' },
        description: { type: 'string', description: 'Descrizione dettagliata' },
        priority: { type: 'string', description: 'Priorità: LOW, MEDIUM, HIGH, URGENT (default: MEDIUM)' },
        assigneeId: { type: 'string', description: 'ID utente assegnatario' },
        projectId: { type: 'string', description: 'ID progetto' },
        folderId: { type: 'string', description: 'ID cartella del progetto in cui inserire il task' },
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
          folderId: (input.folderId as string) || null,
          dueDate: input.dueDate ? (parseDate(input.dueDate) ?? null) : null,
          isPersonal: !input.projectId,
        },
      })

      // Create assignment
      const assigneeId = (input.assigneeId as string) || context.userId
      await prisma.taskAssignment.create({
        data: {
          taskId: task.id,
          userId: assigneeId,
          role: 'assignee',
          assignedBy: context.userId,
        },
      })

      // Notify assignee if different from creator
      if (assigneeId !== context.userId) {
        const creator = await prisma.user.findUnique({
          where: { id: context.userId },
          select: { firstName: true, lastName: true },
        })
        const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'Assistente AI'
        await dispatchNotification({
          type: 'task_assigned',
          title: 'Nuovo task assegnato',
          message: `${creatorName} ti ha assegnato "${task.title}"`,
          link: `/tasks?taskId=${task.id}`,
          projectId: (input.projectId as string) || undefined,
          recipientIds: [assigneeId],
          excludeUserId: context.userId,
        })
      }

      return { success: true, data: { id: task.id, title: task.title, status: task.status } }
    },
  },

  {
    name: 'update_task',
    description: 'Aggiorna un task esistente (stato, priorità, assegnatario, scadenza, cartella). Usa folderId per spostare un task in una cartella diversa.',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID del task da aggiornare (obbligatorio)' },
        status: { type: 'string', description: 'Nuovo stato: TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED' },
        priority: { type: 'string', description: 'Nuova priorità: LOW, MEDIUM, HIGH, URGENT' },
        assigneeId: { type: 'string', description: 'Nuovo assegnatario (ID utente)' },
        dueDate: { type: 'string', description: 'Nuova scadenza (ISO 8601)' },
        title: { type: 'string', description: 'Nuovo titolo' },
        description: { type: 'string', description: 'Nuova descrizione' },
        folderId: { type: 'string', description: 'ID cartella di destinazione (per spostare il task in una cartella). Usa null per rimuovere dalla cartella.' },
      },
      required: ['taskId'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const taskId = input.taskId as string
      const data = buildTaskUpdateData(input)
      if ('error' in data) return data as { success: false; error: string }

      const task = await prisma.task.update({
        where: { id: taskId },
        data,
        select: { id: true, title: true, status: true, priority: true, projectId: true },
      })

      await notifyTaskUpdate(taskId, input, task, context)

      return { success: true, data: { id: task.id, title: task.title, status: task.status, priority: task.priority } }
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

  {
    name: 'add_task_comment',
    description: 'Aggiunge un commento a un task esistente.',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID del task (obbligatorio)' },
        content: { type: 'string', description: 'Testo del commento (obbligatorio)' },
      },
      required: ['taskId', 'content'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const taskId = input.taskId as string
      const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true, title: true, projectId: true } })
      if (!task) return { success: false, error: 'Task non trovato' }

      const comment = await prisma.comment.create({
        data: {
          taskId,
          authorId: context.userId,
          content: input.content as string,
        },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
        },
      })

      // Notify task participants (same as regular comment flow)
      const recipients = await getTaskParticipants(taskId)
      const authorName = `${comment.author.firstName} ${comment.author.lastName}`
      await dispatchNotification({
        type: 'task_comment',
        title: 'Nuovo commento',
        message: `${authorName} ha commentato "${task.title}"`,
        link: `/tasks?taskId=${taskId}&commentId=${comment.id}`,
        projectId: task.projectId ?? undefined,
        groupKey: `task_comment:${taskId}`,
        actorName: authorName,
        recipientIds: recipients,
        excludeUserId: context.userId,
      })

      return { success: true, data: { id: comment.id, content: comment.content, createdAt: comment.createdAt } }
    },
  },

  {
    name: 'delete_task',
    description: 'Elimina un task. Attenzione: l\'eliminazione è permanente.',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID del task da eliminare (obbligatorio)' },
      },
      required: ['taskId'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const task = await prisma.task.findUnique({
        where: { id: input.taskId as string },
        select: { id: true, title: true, _count: { select: { subtasks: true } } },
      })
      if (!task) return { success: false, error: 'Task non trovato' }

      await prisma.task.delete({ where: { id: input.taskId as string } })

      return { success: true, data: { id: task.id, title: task.title, deleted: true } }
    },
  },

  {
    name: 'list_task_attachments',
    description: 'Lista gli allegati di un task specifico.',
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
      const attachments = await prisma.taskAttachment.findMany({
        where: { taskId: input.taskId as string },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          fileSize: true,
          mimeType: true,
          type: true,
          createdAt: true,
          uploadedBy: { select: { firstName: true, lastName: true } },
        },
      })

      return { success: true, data: { attachments, total: attachments.length } }
    },
  },

  {
    name: 'get_task_dependencies',
    description: 'Mostra le dipendenze di un task: da quali task dipende e quali task dipendono da lui.',
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
      const taskId = input.taskId as string

      const [dependsOn, blockedBy] = await Promise.all([
        prisma.taskDependency.findMany({
          where: { taskId },
          include: {
            dependsOn: { select: { id: true, title: true, status: true, priority: true } },
          },
        }),
        prisma.taskDependency.findMany({
          where: { dependsOnId: taskId },
          include: {
            task: { select: { id: true, title: true, status: true, priority: true } },
          },
        }),
      ])

      return {
        success: true,
        data: {
          dependsOn: dependsOn.map((d) => ({ ...d.dependsOn, type: d.type })),
          blocks: blockedBy.map((d) => ({ ...d.task, type: d.type })),
        },
      }
    },
  },

  {
    name: 'add_task_dependency',
    description: 'Aggiunge una dipendenza tra task (es. il task A deve essere completato prima del task B).',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID del task che dipende (obbligatorio)' },
        dependsOnId: { type: 'string', description: 'ID del task da cui dipende (obbligatorio)' },
        type: { type: 'string', description: 'Tipo dipendenza: finish_to_start (default), start_to_start, finish_to_finish' },
      },
      required: ['taskId', 'dependsOnId'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const taskId = input.taskId as string
      const dependsOnId = input.dependsOnId as string

      if (taskId === dependsOnId) {
        return { success: false, error: 'Un task non può dipendere da se stesso' }
      }

      const dep = await prisma.taskDependency.create({
        data: {
          taskId,
          dependsOnId,
          type: (input.type as string) || 'finish_to_start',
        },
        include: {
          task: { select: { title: true } },
          dependsOn: { select: { title: true } },
        },
      })

      return { success: true, data: { id: dep.id, task: dep.task.title, dependsOn: dep.dependsOn.title, type: dep.type } }
    },
  },

  // --- create_subtask ---
  {
    name: 'create_subtask',
    description: 'Crea un sotto-task (subtask) collegato a un task padre. Supporta nidificazione infinita (subtask di subtask).',
    input_schema: {
      type: 'object',
      properties: {
        parentId: { type: 'string', description: 'ID del task padre (può essere un task o un altro subtask per nidificazione infinita)' },
        title: { type: 'string', description: 'Titolo del subtask' },
        description: { type: 'string', description: 'Descrizione (opzionale)' },
        assigneeId: { type: 'string', description: 'ID utente assegnato (opzionale)' },
        priority: { type: 'string', description: 'Priorità: LOW, MEDIUM, HIGH, URGENT' },
        dueDate: { type: 'string', description: 'Data scadenza (ISO 8601)' },
      },
      required: ['parentId', 'title'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input, context) => {
      const parent = await prisma.task.findUnique({
        where: { id: input.parentId as string },
        select: { id: true, projectId: true },
      })
      if (!parent) return { success: false, error: 'Task padre non trovato' }

      const subtask = await prisma.task.create({
        data: {
          title: input.title as string,
          description: (input.description as string) || undefined,
          parentId: parent.id,
          projectId: parent.projectId,
          creatorId: context.userId,
          assigneeId: (input.assigneeId as string) || undefined,
          priority: ((input.priority as string) || 'MEDIUM') as Priority,
          dueDate: input.dueDate ? (parseDate(input.dueDate) ?? null) : null,
          status: 'TODO',
        },
        select: { id: true, title: true, status: true, priority: true, assigneeId: true, parentId: true },
      })
      return { success: true, data: subtask }
    },
  },

  // --- list_subtasks ---
  {
    name: 'list_subtasks',
    description: 'Lista i sotto-task di un task padre',
    input_schema: {
      type: 'object',
      properties: {
        parentId: { type: 'string', description: 'ID del task padre' },
      },
      required: ['parentId'],
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input) => {
      const subtasks = await prisma.task.findMany({
        where: { parentId: input.parentId as string },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, title: true, status: true, priority: true,
          assignee: { select: { id: true, firstName: true, lastName: true } },
          dueDate: true,
        },
      })
      return { success: true, data: { subtasks, total: subtasks.length } }
    },
  },

  // --- move_task_to_folder ---
  {
    name: 'move_task_to_folder',
    description: 'Sposta uno o più task in una cartella di progetto specifica. Usa folderId null per rimuovere dalla cartella.',
    input_schema: {
      type: 'object',
      properties: {
        taskIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array di ID dei task da spostare (obbligatorio)',
        },
        folderId: { type: 'string', description: 'ID della cartella di destinazione (null per rimuovere dalla cartella)' },
      },
      required: ['taskIds'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input) => {
      const taskIds = input.taskIds as string[]
      const folderId = (input.folderId as string) || null

      if (!taskIds.length) return { success: false, error: 'Nessun task specificato' }

      // Validate folder exists if provided
      if (folderId) {
        const folder = await prisma.folder.findUnique({
          where: { id: folderId },
          select: { id: true, name: true, projectId: true },
        })
        if (!folder) return { success: false, error: 'Cartella non trovata' }
      }

      await prisma.task.updateMany({
        where: { id: { in: taskIds } },
        data: { folderId },
      })

      const tasks = await prisma.task.findMany({
        where: { id: { in: taskIds } },
        select: { id: true, title: true, folderId: true },
      })

      return { success: true, data: { moved: tasks.length, tasks, folderId } }
    },
  },

  // --- log_task_time ---
  {
    name: 'log_task_time',
    description: 'Registra tempo lavorato su un task (time tracking).',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID del task (obbligatorio)' },
        hours: { type: 'number', description: 'Ore lavorate (0-24, obbligatorio)' },
        description: { type: 'string', description: 'Descrizione attività svolta' },
        billable: { type: 'boolean', description: 'Se fatturabile (default: true)' },
        date: { type: 'string', description: 'Data della registrazione (ISO 8601, default: oggi)' },
      },
      required: ['taskId', 'hours'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input, context) => {
      const hours = Number(input.hours)
      if (hours <= 0 || hours > 24) return { success: false, error: 'Ore devono essere tra 0 e 24' }

      const task = await prisma.task.findUnique({
        where: { id: input.taskId as string },
        select: { id: true, projectId: true },
      })
      if (!task) return { success: false, error: 'Task non trovato' }

      const entry = await prisma.timeEntry.create({
        data: {
          taskId: task.id,
          projectId: task.projectId,
          userId: context.userId,
          hours,
          description: (input.description as string) || null,
          billable: input.billable !== false,
          date: input.date ? (parseDate(input.date) ?? new Date()) : new Date(),
        },
        select: { id: true, hours: true, billable: true, date: true },
      })

      return { success: true, data: entry }
    },
  },

  // --- duplicate_task ---
  {
    name: 'duplicate_task',
    description: 'Duplica un task esistente con tutti i suoi subtask. Utile per creare task simili per clienti diversi.',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID del task da duplicare (obbligatorio)' },
        projectId: { type: 'string', description: 'ID del progetto di destinazione (default: stesso progetto)' },
        folderId: { type: 'string', description: 'ID cartella di destinazione' },
        titlePrefix: { type: 'string', description: 'Prefisso da aggiungere al titolo (es. "[COPIA]")' },
        includeSubtasks: { type: 'boolean', description: 'Se true, duplica anche tutti i subtask (default: true)' },
      },
      required: ['taskId'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input, context) => {
      const original = await prisma.task.findUnique({
        where: { id: input.taskId as string },
        include: {
          subtasks: { select: { title: true, description: true, priority: true, status: true, dueDate: true, assigneeId: true } },
        },
      })
      if (!original) return { success: false, error: 'Task non trovato' }

      const prefix = (input.titlePrefix as string) || ''
      const targetProjectId = (input.projectId as string) || original.projectId

      const result = await prisma.$transaction(async (tx) => {
        const newTask = await tx.task.create({
          data: {
            title: prefix ? `${prefix} ${original.title}` : original.title,
            description: original.description,
            priority: original.priority,
            status: 'TODO',
            projectId: targetProjectId,
            folderId: (input.folderId as string) || original.folderId,
            creatorId: context.userId,
            assigneeId: original.assigneeId,
            dueDate: original.dueDate,
            estimatedHours: original.estimatedHours,
          },
          select: { id: true, title: true },
        })

        let subtaskCount = 0
        if (input.includeSubtasks !== false && original.subtasks.length > 0) {
          for (const sub of original.subtasks) {
            await tx.task.create({
              data: {
                title: sub.title,
                description: sub.description,
                priority: sub.priority,
                status: 'TODO',
                projectId: targetProjectId,
                parentId: newTask.id,
                creatorId: context.userId,
                assigneeId: sub.assigneeId,
                dueDate: sub.dueDate,
              },
            })
            subtaskCount++
          }
        }

        return { id: newTask.id, title: newTask.title, subtasksDuplicated: subtaskCount }
      })

      return { success: true, data: result }
    },
  },
]
