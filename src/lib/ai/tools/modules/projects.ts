import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'
import type { AiToolDefinition, AiToolInput, AiToolContext } from '../types'

export const projectTools: AiToolDefinition[] = [
  {
    name: 'list_projects',
    description: 'Lista i progetti filtrabili per stato, priorità, cliente. Restituisce nome, stato, priorità, progresso, membri.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filtra per stato: PLANNING, IN_PROGRESS, ON_HOLD, REVIEW, COMPLETED, CANCELLED' },
        priority: { type: 'string', description: 'Filtra per priorità: LOW, MEDIUM, HIGH, URGENT' },
        clientId: { type: 'string', description: 'Filtra per ID cliente' },
        isInternal: { type: 'boolean', description: 'Se true, mostra solo progetti interni' },
        isArchived: { type: 'boolean', description: 'Se true, mostra progetti archiviati (default: false)' },
        limit: { type: 'number', description: 'Numero massimo risultati (default: 20, max: 50)' },
      },
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const limit = Math.min(Number(input.limit) || 20, 50)
      const where: Record<string, unknown> = {
        isArchived: input.isArchived === true,
      }

      if (input.status) where.status = input.status
      if (input.priority) where.priority = input.priority
      if (input.clientId) where.clientId = input.clientId
      if (input.isInternal !== undefined) where.isInternal = input.isInternal

      const projects = await prisma.project.findMany({
        where,
        take: limit,
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          priority: true,
          startDate: true,
          endDate: true,
          deadline: true,
          isInternal: true,
          color: true,
          client: { select: { id: true, companyName: true } },
          _count: { select: { tasks: true, members: true } },
        },
      })

      return { success: true, data: { projects, total: projects.length } }
    },
  },

  {
    name: 'create_project',
    description: 'Crea un nuovo progetto con nome, descrizione, priorità, date, budget e cliente. L\'utente viene aggiunto come OWNER.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome del progetto (obbligatorio)' },
        description: { type: 'string', description: 'Descrizione del progetto' },
        priority: { type: 'string', description: 'Priorità: LOW, MEDIUM, HIGH, URGENT (default: MEDIUM)' },
        clientId: { type: 'string', description: 'ID del cliente associato' },
        startDate: { type: 'string', description: 'Data inizio (ISO 8601)' },
        endDate: { type: 'string', description: 'Data fine prevista (ISO 8601)' },
        deadline: { type: 'string', description: 'Deadline (ISO 8601)' },
        budgetAmount: { type: 'number', description: 'Budget in euro' },
        budgetHours: { type: 'number', description: 'Ore budget stimate' },
        color: { type: 'string', description: 'Colore esadecimale (#RRGGBB)' },
        isInternal: { type: 'boolean', description: 'Progetto interno aziendale (default: false)' },
      },
      required: ['name'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const name = input.name as string
      const slug = slugify(name)

      // Check slug uniqueness
      const existing = await prisma.project.findUnique({ where: { slug } })
      if (existing) {
        return { success: false, error: `Esiste già un progetto con slug "${slug}". Scegli un nome diverso.` }
      }

      // Find or create default workspace
      let workspaceId: string
      const defaultWorkspace = await prisma.workspace.findFirst({
        where: { slug: 'clienti' },
        select: { id: true },
      })
      if (defaultWorkspace) {
        workspaceId = defaultWorkspace.id
      } else {
        const ws = await prisma.workspace.create({
          data: { name: 'Clienti', slug: 'clienti' },
        })
        workspaceId = ws.id
      }

      const project = await prisma.project.create({
        data: {
          name,
          slug,
          workspaceId,
          description: (input.description as string) || null,
          priority: (input.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') || 'MEDIUM',
          clientId: (input.clientId as string) || null,
          startDate: input.startDate ? new Date(input.startDate as string) : null,
          endDate: input.endDate ? new Date(input.endDate as string) : null,
          deadline: input.deadline ? new Date(input.deadline as string) : null,
          budgetAmount: input.budgetAmount ? input.budgetAmount as number : null,
          budgetHours: input.budgetHours ? Number(input.budgetHours) : null,
          color: (input.color as string) || '#6366F1',
          isInternal: (input.isInternal as boolean) || false,
          members: {
            create: [{ userId: context.userId, role: 'OWNER' }],
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          priority: true,
          isInternal: true,
        },
      })

      return { success: true, data: project }
    },
  },

  {
    name: 'update_project',
    description: 'Aggiorna un progetto esistente (stato, priorità, date, budget, descrizione).',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del progetto (obbligatorio)' },
        name: { type: 'string', description: 'Nuovo nome' },
        description: { type: 'string', description: 'Nuova descrizione' },
        status: { type: 'string', description: 'Nuovo stato: PLANNING, IN_PROGRESS, ON_HOLD, REVIEW, COMPLETED, CANCELLED' },
        priority: { type: 'string', description: 'Nuova priorità: LOW, MEDIUM, HIGH, URGENT' },
        startDate: { type: 'string', description: 'Nuova data inizio (ISO 8601)' },
        endDate: { type: 'string', description: 'Nuova data fine (ISO 8601)' },
        deadline: { type: 'string', description: 'Nuova deadline (ISO 8601)' },
        budgetAmount: { type: 'number', description: 'Nuovo budget in euro' },
        budgetHours: { type: 'number', description: 'Nuove ore budget' },
        color: { type: 'string', description: 'Nuovo colore (#RRGGBB)' },
      },
      required: ['projectId'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const data: Record<string, unknown> = {}
      if (input.name) data.name = input.name
      if (input.description !== undefined) data.description = input.description
      if (input.status) data.status = input.status
      if (input.priority) data.priority = input.priority
      if (input.startDate) data.startDate = new Date(input.startDate as string)
      if (input.endDate) data.endDate = new Date(input.endDate as string)
      if (input.deadline) data.deadline = new Date(input.deadline as string)
      if (input.budgetAmount !== undefined) data.budgetAmount = input.budgetAmount
      if (input.budgetHours !== undefined) data.budgetHours = Number(input.budgetHours)
      if (input.color) data.color = input.color

      const project = await prisma.project.update({
        where: { id: input.projectId as string },
        data,
        select: { id: true, name: true, status: true, priority: true },
      })

      return { success: true, data: project }
    },
  },

  {
    name: 'get_project_details',
    description: 'Ottieni tutti i dettagli di un progetto: task, membri, budget, milestone, statistiche.',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del progetto (obbligatorio)' },
      },
      required: ['projectId'],
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const project = await prisma.project.findUnique({
        where: { id: input.projectId as string },
        include: {
          client: { select: { id: true, companyName: true } },
          workspace: { select: { id: true, name: true } },
          members: {
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
          },
          _count: { select: { tasks: true, documents: true, quotes: true, tickets: true, expenses: true } },
        },
      })

      if (!project) return { success: false, error: 'Progetto non trovato' }

      // Task breakdown by status
      const taskStats = await prisma.task.groupBy({
        by: ['status'],
        where: { projectId: project.id },
        _count: true,
      })

      const totalTasks = taskStats.reduce((sum, s) => sum + s._count, 0)
      const doneTasks = taskStats.find(s => s.status === 'DONE')?._count || 0
      const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

      return {
        success: true,
        data: {
          ...project,
          taskStats: Object.fromEntries(taskStats.map(s => [s.status, s._count])),
          progress,
          totalTasks,
        },
      }
    },
  },

  {
    name: 'archive_project',
    description: 'Archivia o ripristina un progetto.',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del progetto (obbligatorio)' },
        archive: { type: 'boolean', description: 'true per archiviare, false per ripristinare (default: true)' },
      },
      required: ['projectId'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const archive = input.archive !== false

      const project = await prisma.project.update({
        where: { id: input.projectId as string },
        data: { isArchived: archive },
        select: { id: true, name: true, isArchived: true },
      })

      return { success: true, data: project }
    },
  },
]
