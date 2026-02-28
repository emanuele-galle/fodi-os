import { prisma } from '@/lib/prisma'
import { computeUserStats } from '@/lib/analytics-utils'
import type { AiToolDefinition, AiToolInput } from '../types'

export const reportTools: AiToolDefinition[] = [
  {
    name: 'get_analytics_overview',
    description: 'Ottieni una panoramica analitica della piattaforma: task, progetti, lead attivi, deal in pipeline.',
    input_schema: {
      type: 'object',
      properties: {},
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async () => {
      const [taskCounts, projectCounts, leadCounts, dealStats] = await Promise.all([
        prisma.task.groupBy({
          by: ['status'],
          _count: true,
        }),
        prisma.project.groupBy({
          by: ['status'],
          _count: true,
          where: { isArchived: false },
        }),
        prisma.lead.groupBy({
          by: ['status'],
          _count: true,
        }),
        prisma.deal.aggregate({
          where: { stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } },
          _count: true,
          _sum: { value: true },
          _avg: { probability: true },
        }),
      ])

      return {
        success: true,
        data: {
          tasks: Object.fromEntries(taskCounts.map((t) => [t.status, t._count])),
          projects: Object.fromEntries(projectCounts.map((p) => [p.status, p._count])),
          leads: Object.fromEntries(leadCounts.map((l) => [l.status, l._count])),
          pipeline: {
            activeDeals: dealStats._count,
            totalValue: dealStats._sum?.value?.toString() || '0',
            avgProbability: Math.round(dealStats._avg?.probability || 0),
          },
        },
      }
    },
  },

  {
    name: 'get_crm_stats',
    description: 'Ottieni statistiche CRM dettagliate: clienti per stato, lead recenti, deal per fase, top clienti per fatturato.',
    input_schema: {
      type: 'object',
      properties: {},
    },
    module: 'crm',
    requiredPermission: 'read',
    execute: async () => {
      const [clientsByStatus, recentLeads, dealsByStage, topClients] = await Promise.all([
        prisma.client.groupBy({
          by: ['status'],
          _count: true,
        }),
        prisma.lead.count({
          where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        }),
        prisma.deal.groupBy({
          by: ['stage'],
          _count: true,
          _sum: { value: true },
        }),
        prisma.client.findMany({
          take: 5,
          orderBy: { totalRevenue: 'desc' },
          where: { status: 'ACTIVE' },
          select: { companyName: true, totalRevenue: true, industry: true },
        }),
      ])

      return {
        success: true,
        data: {
          clientsByStatus: Object.fromEntries(clientsByStatus.map((c) => [c.status, c._count])),
          leadsLast30Days: recentLeads,
          dealsByStage: dealsByStage.map((d) => ({
            stage: d.stage,
            count: d._count,
            totalValue: d._sum?.value?.toString() || '0',
          })),
          topClients: topClients.map((c) => ({
            name: c.companyName,
            revenue: c.totalRevenue.toString(),
            industry: c.industry,
          })),
        },
      }
    },
  },

  {
    name: 'get_team_workload',
    description: 'Analizza il carico di lavoro del team: task per membro, completati, in ritardo, ore registrate.',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Filtra per progetto (opzionale)' },
      },
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const where: Record<string, unknown> = {}
      if (input.projectId) where.projectId = input.projectId

      const tasks = await prisma.task.findMany({
        where,
        select: {
          status: true,
          dueDate: true,
          assignee: { select: { id: true, firstName: true, lastName: true } },
          assignments: {
            select: { user: { select: { id: true, firstName: true, lastName: true } } },
          },
          timeEntries: { select: { hours: true } },
        },
      })

      const stats = computeUserStats(tasks, new Date())

      return { success: true, data: { teamMembers: stats, totalMembers: stats.length } }
    },
  },

  {
    name: 'get_project_status',
    description: 'Ottieni lo stato dettagliato di un progetto specifico: task, membri, timeline, avanzamento.',
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
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
          client: { select: { id: true, companyName: true } },
          members: {
            select: {
              role: true,
              user: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          _count: { select: { tasks: true, attachments: true } },
        },
      })

      if (!project) return { success: false, error: 'Progetto non trovato' }

      // Get task stats for this project
      const taskStats = await prisma.task.groupBy({
        by: ['status'],
        where: { projectId: input.projectId as string },
        _count: true,
      })

      const totalTasks = taskStats.reduce((sum, t) => sum + t._count, 0)
      const doneTasks = taskStats.find(t => t.status === 'DONE')?._count || 0
      const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

      // Overdue tasks
      const overdueTasks = await prisma.task.count({
        where: {
          projectId: input.projectId as string,
          status: { notIn: ['DONE', 'CANCELLED'] },
          dueDate: { lt: new Date() },
        },
      })

      return {
        success: true,
        data: {
          ...project,
          tasksByStatus: Object.fromEntries(taskStats.map(t => [t.status, t._count])),
          progress,
          overdueTasks,
        },
      }
    },
  },

  {
    name: 'search_platform',
    description: 'Cerca nella piattaforma attraverso task, clienti, lead, progetti. Utile per trovare informazioni rapidamente.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Termine di ricerca (obbligatorio, minimo 2 caratteri)' },
        scope: { type: 'string', description: 'Ambito: all, tasks, clients, leads, projects (default: all)' },
        limit: { type: 'number', description: 'Risultati per tipo (default: 5)' },
      },
      required: ['query'],
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const query = (input.query as string).trim()
      if (query.length < 2) return { success: false, error: 'Query troppo corta (minimo 2 caratteri)' }

      const limit = Math.min(Number(input.limit) || 5, 10)
      const scope = (input.scope as string) || 'all'
      const results: Record<string, unknown> = {}

      if (scope === 'all' || scope === 'tasks') {
        results.tasks = await prisma.task.findMany({
          where: { title: { contains: query, mode: 'insensitive' } },
          take: limit,
          select: { id: true, title: true, status: true, priority: true },
        })
      }

      if (scope === 'all' || scope === 'clients') {
        results.clients = await prisma.client.findMany({
          where: { companyName: { contains: query, mode: 'insensitive' } },
          take: limit,
          select: { id: true, companyName: true, status: true },
        })
      }

      if (scope === 'all' || scope === 'leads') {
        results.leads = await prisma.lead.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { company: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: limit,
          select: { id: true, name: true, company: true, status: true },
        })
      }

      if (scope === 'all' || scope === 'projects') {
        results.projects = await prisma.project.findMany({
          where: { name: { contains: query, mode: 'insensitive' }, isArchived: false },
          take: limit,
          select: { id: true, name: true, status: true },
        })
      }

      return { success: true, data: results }
    },
  },
]
