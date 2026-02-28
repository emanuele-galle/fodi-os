import { prisma } from '@/lib/prisma'
import type { AiToolDefinition, AiToolInput, AiToolContext } from '../types'

export const coordinationTools: AiToolDefinition[] = [
  {
    name: 'create_project_from_brief',
    description: 'Crea un progetto completo da un brief testuale: crea il progetto, genera task strutturate con priorità e scadenze, e li assegna al team.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome del progetto' },
        description: { type: 'string', description: 'Descrizione/brief del progetto' },
        clientId: { type: 'string', description: 'ID del cliente associato (opzionale)' },
        tasks: {
          type: 'array',
          description: 'Lista di task da creare nel progetto',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Titolo del task' },
              description: { type: 'string', description: 'Descrizione del task' },
              priority: { type: 'string', description: 'Priorità: LOW, MEDIUM, HIGH, URGENT' },
              assigneeId: { type: 'string', description: 'ID utente assegnatario (opzionale)' },
              dueDate: { type: 'string', description: 'Scadenza ISO 8601 (opzionale)' },
            },
          },
        },
        deadline: { type: 'string', description: 'Scadenza progetto ISO 8601 (opzionale)' },
      },
      required: ['name', 'description'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      try {
        // Find user's workspace
        const membership = await prisma.workspaceMember.findFirst({
          where: { userId: context.userId },
          select: { workspaceId: true },
        })
        if (!membership) {
          return { success: false, error: 'Nessun workspace trovato per l\'utente' }
        }

        // Generate slug from name
        const slug = (input.name as string)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          + '-' + Date.now().toString(36)

        const projectData: Record<string, unknown> = {
            name: input.name as string,
            slug,
            description: input.description as string,
            workspaceId: membership.workspaceId,
            status: 'ACTIVE',
        }
        if (input.clientId) projectData.clientId = input.clientId as string
        if (input.deadline) projectData.deadline = new Date(input.deadline as string)

        const project = await prisma.project.create({
          data: projectData as Parameters<typeof prisma.project.create>[0]['data'],
        })

        const tasks = (input.tasks as { title: string; description?: string; priority?: string; assigneeId?: string; dueDate?: string }[]) || []
        const createdTasks = []

        for (let i = 0; i < tasks.length; i++) {
          const t = tasks[i]
          const task = await prisma.task.create({
            data: {
              title: t.title,
              description: t.description || '',
              priority: (t.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') || 'MEDIUM',
              status: 'TODO',
              creatorId: context.userId,
              assigneeId: t.assigneeId || null,
              projectId: project.id,
              dueDate: t.dueDate ? new Date(t.dueDate) : null,
              sortOrder: i,
            },
          })
          createdTasks.push({ id: task.id, title: task.title, assigneeId: task.assigneeId })
        }

        return {
          success: true,
          data: {
            project: { id: project.id, name: project.name },
            tasksCreated: createdTasks.length,
            tasks: createdTasks,
          },
        }
      } catch (err) {
        return { success: false, error: `Errore creazione progetto: ${(err as Error).message}` }
      }
    },
  },

  {
    name: 'auto_assign_tasks',
    description: 'Analizza il carico di lavoro del team e suggerisce/esegue assegnazioni ottimali per task non assegnati.',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID progetto di cui assegnare i task (opzionale, altrimenti tutti i task non assegnati)' },
        execute: { type: 'boolean', description: 'Se true, esegue le assegnazioni. Se false, suggerisce soltanto.' },
      },
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      try {
        // Get unassigned tasks
        const where: Record<string, unknown> = {
          assigneeId: null,
          status: { in: ['TODO', 'IN_PROGRESS'] },
        }
        if (input.projectId) where.projectId = input.projectId

        const unassigned = await prisma.task.findMany({
          where,
          select: { id: true, title: true, priority: true, projectId: true },
          take: 50,
        })

        if (unassigned.length === 0) {
          return { success: true, data: { message: 'Nessun task non assegnato trovato', suggestions: [] } }
        }

        // Get team workload (count active tasks per user)
        const members = await prisma.user.findMany({
          where: { isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            _count: { select: { assignedTasks: { where: { status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] } } } } },
          },
        })

        // Sort by least loaded
        const sorted = members
          .map(m => ({ id: m.id, name: `${m.firstName} ${m.lastName}`, role: m.role, taskCount: m._count.assignedTasks }))
          .sort((a, b) => a.taskCount - b.taskCount)

        // Build suggestions: round-robin to least loaded
        const suggestions = unassigned.map((task, i) => {
          const assignee = sorted[i % sorted.length]
          return {
            taskId: task.id,
            taskTitle: task.title,
            suggestedAssignee: assignee.name,
            suggestedAssigneeId: assignee.id,
            currentLoad: assignee.taskCount,
          }
        })

        // Execute if requested
        if (input.execute) {
          for (const s of suggestions) {
            await prisma.task.update({
              where: { id: s.taskId },
              data: { assigneeId: s.suggestedAssigneeId },
            })
          }
          return { success: true, data: { message: `${suggestions.length} task assegnati`, assignments: suggestions } }
        }

        return { success: true, data: { message: `${suggestions.length} suggerimenti di assegnazione`, suggestions } }
      } catch (err) {
        return { success: false, error: `Errore auto-assign: ${(err as Error).message}` }
      }
    },
  },

  {
    name: 'check_team_progress',
    description: 'Report dettagliato dell\'avanzamento di un progetto o del team: task completati, in corso, in ritardo, carico per membro.',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID progetto (opzionale)' },
      },
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      try {
        const where: Record<string, unknown> = {}
        if (input.projectId) where.projectId = input.projectId

        const [total, done, inProgress, todo, overdue] = await Promise.all([
          prisma.task.count({ where }),
          prisma.task.count({ where: { ...where, status: 'DONE' } }),
          prisma.task.count({ where: { ...where, status: 'IN_PROGRESS' } }),
          prisma.task.count({ where: { ...where, status: 'TODO' } }),
          prisma.task.count({ where: { ...where, status: { in: ['TODO', 'IN_PROGRESS'] }, dueDate: { lt: new Date() } } }),
        ])

        // Per-member breakdown
        const memberStats = await prisma.user.findMany({
          where: { isActive: true },
          select: {
            firstName: true,
            lastName: true,
            _count: {
              select: {
                assignedTasks: { where: { ...where, status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] } } },
              },
            },
          },
        })

        return {
          success: true,
          data: {
            summary: {
              total,
              done,
              inProgress,
              todo,
              overdue,
              completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
            },
            teamLoad: memberStats.map(m => ({
              name: `${m.firstName} ${m.lastName}`,
              activeTasks: m._count.assignedTasks,
            })),
          },
        }
      } catch (err) {
        return { success: false, error: `Errore report: ${(err as Error).message}` }
      }
    },
  },

  {
    name: 'send_team_notification',
    description: 'Invia una notifica push a un membro del team (follow-up, sollecito, aggiornamento).',
    input_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'ID utente destinatario' },
        title: { type: 'string', description: 'Titolo della notifica' },
        message: { type: 'string', description: 'Corpo della notifica' },
        url: { type: 'string', description: 'URL a cui navigare al click (opzionale)' },
      },
      required: ['userId', 'title', 'message'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      try {
        // Create in-app notification
        await prisma.notification.create({
          data: {
            userId: input.userId as string,
            type: 'ai_notification',
            title: input.title as string,
            message: input.message as string,
            link: (input.url as string) || null,
          },
        })

        return { success: true, data: { message: 'Notifica inviata' } }
      } catch (err) {
        return { success: false, error: `Errore invio notifica: ${(err as Error).message}` }
      }
    },
  },

  {
    name: 'suggest_task_breakdown',
    description: 'Dato un obiettivo o una richiesta, suggerisce una suddivisione in task con priorità e stima impegno.',
    input_schema: {
      type: 'object',
      properties: {
        objective: { type: 'string', description: 'Obiettivo o richiesta da suddividere in task' },
        projectType: { type: 'string', description: 'Tipo progetto: website, app, branding, marketing, custom (opzionale)' },
      },
      required: ['objective'],
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      // This tool is a "prompt" tool — the AI itself generates the breakdown
      // based on the objective. We just return the input for the AI to process.
      return {
        success: true,
        data: {
          message: 'Analizza l\'obiettivo e suggerisci una suddivisione in task. Considera le fasi tipiche del progetto, le dipendenze, e le competenze necessarie.',
          objective: input.objective,
          projectType: input.projectType || 'custom',
        },
      }
    },
  },

  {
    name: 'get_team_skills',
    description: 'Restituisce la mappa delle competenze del team: ruoli, specializzazioni, carico attuale.',
    input_schema: {
      type: 'object',
      properties: {},
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async () => {
      try {
        const members = await prisma.user.findMany({
          where: { isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            jobTitle: true,
            _count: {
              select: {
                assignedTasks: { where: { status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] } } },
              },
            },
          },
        })

        return {
          success: true,
          data: {
            team: members.map(m => ({
              id: m.id,
              name: `${m.firstName} ${m.lastName}`,
              role: m.role,
              jobTitle: m.jobTitle,
              activeTasks: m._count.assignedTasks,
            })),
          },
        }
      } catch (err) {
        return { success: false, error: `Errore team skills: ${(err as Error).message}` }
      }
    },
  },
]
