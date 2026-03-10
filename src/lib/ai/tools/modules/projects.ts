/* eslint-disable sonarjs/no-duplicate-string -- JSON schema property types are repeated by design */
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
          color: (input.color as string) || '#007AFF',
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
    description: 'Aggiorna un progetto esistente (stato, priorità, date, budget, descrizione, cliente).',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del progetto (obbligatorio)' },
        name: { type: 'string', description: 'Nuovo nome' },
        description: { type: 'string', description: 'Nuova descrizione' },
        status: { type: 'string', description: 'Nuovo stato: PLANNING, IN_PROGRESS, ON_HOLD, REVIEW, COMPLETED, CANCELLED' },
        priority: { type: 'string', description: 'Nuova priorità: LOW, MEDIUM, HIGH, URGENT' },
        clientId: { type: 'string', description: 'ID del cliente da associare al progetto (null per rimuovere)' },
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
      if (input.clientId !== undefined) data.clientId = input.clientId || null
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

  {
    name: 'list_milestones',
    description: 'Lista le milestone di un progetto con stato e scadenza.',
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
      const milestones = await prisma.milestone.findMany({
        where: { projectId: input.projectId as string },
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: { select: { tasks: true } },
        },
      })

      return { success: true, data: { milestones, total: milestones.length } }
    },
  },

  {
    name: 'create_milestone',
    description: 'Crea una milestone (traguardo) per un progetto.',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del progetto (obbligatorio)' },
        name: { type: 'string', description: 'Nome della milestone (obbligatorio)' },
        dueDate: { type: 'string', description: 'Data scadenza (ISO 8601)' },
      },
      required: ['projectId', 'name'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const maxOrder = await prisma.milestone.aggregate({
        where: { projectId: input.projectId as string },
        _max: { sortOrder: true },
      })

      const milestone = await prisma.milestone.create({
        data: {
          projectId: input.projectId as string,
          name: input.name as string,
          dueDate: input.dueDate ? new Date(input.dueDate as string) : null,
          sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        },
      })

      return { success: true, data: milestone }
    },
  },

  {
    name: 'update_milestone',
    description: 'Aggiorna una milestone (nome, stato, scadenza).',
    input_schema: {
      type: 'object',
      properties: {
        milestoneId: { type: 'string', description: 'ID della milestone (obbligatorio)' },
        name: { type: 'string', description: 'Nuovo nome' },
        status: { type: 'string', description: 'Nuovo stato: pending, in_progress, completed' },
        dueDate: { type: 'string', description: 'Nuova data scadenza (ISO 8601)' },
      },
      required: ['milestoneId'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const data: Record<string, unknown> = {}
      if (input.name) data.name = input.name
      if (input.status) data.status = input.status
      if (input.dueDate) data.dueDate = new Date(input.dueDate as string)

      const milestone = await prisma.milestone.update({
        where: { id: input.milestoneId as string },
        data,
      })

      return { success: true, data: milestone }
    },
  },

  {
    name: 'list_project_members',
    description: 'Lista i membri di un progetto con ruolo e data di ingresso.',
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
      const members = await prisma.projectMember.findMany({
        where: { projectId: input.projectId as string },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, jobTitle: true } },
        },
        orderBy: { joinedAt: 'asc' },
      })

      return { success: true, data: { members, total: members.length } }
    },
  },

  {
    name: 'add_project_member',
    description: 'Aggiunge un membro a un progetto con un ruolo specifico.',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del progetto (obbligatorio)' },
        userId: { type: 'string', description: 'ID dell\'utente da aggiungere (obbligatorio)' },
        role: { type: 'string', description: 'Ruolo nel progetto: OWNER, MANAGER, MEMBER, VIEWER (default: MEMBER)' },
      },
      required: ['projectId', 'userId'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const member = await prisma.projectMember.create({
        data: {
          projectId: input.projectId as string,
          userId: input.userId as string,
          role: (input.role as string) || 'MEMBER',
        },
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      })

      return { success: true, data: { id: member.id, user: `${member.user.firstName} ${member.user.lastName}`, role: member.role } }
    },
  },

  {
    name: 'remove_project_member',
    description: 'Rimuove un membro da un progetto.',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del progetto (obbligatorio)' },
        userId: { type: 'string', description: 'ID dell\'utente da rimuovere (obbligatorio)' },
      },
      required: ['projectId', 'userId'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      await prisma.projectMember.delete({
        where: {
          projectId_userId: {
            projectId: input.projectId as string,
            userId: input.userId as string,
          },
        },
      })

      return { success: true, data: { removed: true } }
    },
  },

  // --- list_project_attachments ---
  {
    name: 'list_project_attachments',
    description: 'Lista gli allegati (file) di un progetto',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del progetto' },
        folderId: { type: 'string', description: 'Filtra per cartella (opzionale)' },
      },
      required: ['projectId'],
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input) => {
      const where: Record<string, unknown> = { projectId: input.projectId as string }
      if (input.folderId) where.folderId = input.folderId

      const attachments = await prisma.projectAttachment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, fileName: true, fileUrl: true, fileSize: true, mimeType: true, type: true, createdAt: true,
          uploadedBy: { select: { id: true, firstName: true, lastName: true } },
          folder: { select: { id: true, name: true } },
        },
      })
      return { success: true, data: { attachments, total: attachments.length } }
    },
  },

  // --- delete_milestone ---
  {
    name: 'delete_milestone',
    description: 'Elimina una milestone di progetto',
    input_schema: {
      type: 'object',
      properties: {
        milestoneId: { type: 'string', description: 'ID della milestone da eliminare' },
      },
      required: ['milestoneId'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input) => {
      await prisma.milestone.delete({ where: { id: input.milestoneId as string } })
      return { success: true, data: { deleted: true } }
    },
  },

  // --- duplicate_project ---
  {
    name: 'duplicate_project',
    description: 'Duplica un progetto esistente con TUTTE le sue cartelle, task, subtask e membri. Supporta sostituzione nomi (es. da "Bodini" a "Zucco" in tutti i titoli). Ideale per creare progetti simili per clienti diversi.',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del progetto sorgente da duplicare (obbligatorio)' },
        name: { type: 'string', description: 'Nome del nuovo progetto (obbligatorio)' },
        clientId: { type: 'string', description: 'ID del cliente da associare al nuovo progetto' },
        replaceText: { type: 'string', description: 'Testo da cercare nei titoli dei task (es. "Bodini")' },
        replaceWith: { type: 'string', description: 'Testo sostitutivo (es. "Zucco"). Richiede replaceText.' },
      },
      required: ['projectId', 'name'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const sourceProjectId = input.projectId as string
      const newName = input.name as string
      const replaceText = input.replaceText as string | undefined
      const replaceWith = input.replaceWith as string | undefined

      // Load source project with all related data
      const source = await prisma.project.findUnique({
        where: { id: sourceProjectId },
        include: {
          members: { select: { userId: true, role: true } },
        },
      })
      if (!source) return { success: false, error: 'Progetto sorgente non trovato' }

      // Load folders, tasks, subtasks separately for better control
      const sourceFolders = await prisma.folder.findMany({
        where: { projectId: sourceProjectId },
        orderBy: { sortOrder: 'asc' },
      })
      const sourceTasks = await prisma.task.findMany({
        where: { projectId: sourceProjectId, parentId: null },
        include: {
          subtasks: { select: { title: true, description: true, priority: true, assigneeId: true, dueDate: true, folderId: true } },
        },
      })

      const newSlug = slugify(newName) + '-' + Date.now().toString(36)

      const applyReplace = (text: string): string => {
        if (!replaceText || !replaceWith) return text
        return text.replace(new RegExp(replaceText, 'gi'), replaceWith)
      }

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create project
        const newProject = await tx.project.create({
          data: {
            name: newName,
            slug: newSlug,
            workspaceId: source.workspaceId,
            description: source.description ? applyReplace(source.description) : null,
            priority: source.priority,
            status: 'PLANNING',
            color: source.color,
            isInternal: source.isInternal,
            clientId: (input.clientId as string) || source.clientId,
            budgetAmount: source.budgetAmount,
            budgetHours: source.budgetHours,
          },
          select: { id: true, name: true, slug: true },
        })

        // 2. Add members
        if (source.members.length > 0) {
          await tx.projectMember.createMany({
            data: source.members.map((m) => ({
              projectId: newProject.id,
              userId: m.userId,
              role: m.role,
            })),
          })
        }

        // 3. Duplicate folders (preserving hierarchy)
        const folderIdMap = new Map<string, string>() // old ID → new ID
        // First pass: root folders
        for (const folder of sourceFolders.filter((f) => !f.parentId)) {
          const newFolder = await tx.folder.create({
            data: {
              projectId: newProject.id,
              name: applyReplace(folder.name),
              description: folder.description ? applyReplace(folder.description) : null,
              color: folder.color,
              sortOrder: folder.sortOrder,
              parentId: null,
            },
          })
          folderIdMap.set(folder.id, newFolder.id)
        }
        // Second pass: child folders (supports 1 level of nesting for common case)
        for (const folder of sourceFolders.filter((f) => f.parentId)) {
          const newParentId = folderIdMap.get(folder.parentId!)
          const newFolder = await tx.folder.create({
            data: {
              projectId: newProject.id,
              name: applyReplace(folder.name),
              description: folder.description ? applyReplace(folder.description) : null,
              color: folder.color,
              sortOrder: folder.sortOrder,
              parentId: newParentId || null,
            },
          })
          folderIdMap.set(folder.id, newFolder.id)
        }

        // 4. Duplicate tasks + subtasks
        let taskCount = 0
        let subtaskCount = 0
        for (const task of sourceTasks) {
          const newFolderId = task.folderId ? (folderIdMap.get(task.folderId) || null) : null
          const newTask = await tx.task.create({
            data: {
              title: applyReplace(task.title),
              description: task.description ? applyReplace(task.description) : null,
              priority: task.priority,
              status: 'TODO',
              projectId: newProject.id,
              folderId: newFolderId,
              creatorId: context.userId,
              assigneeId: task.assigneeId,
              dueDate: task.dueDate,
              estimatedHours: task.estimatedHours,
              sortOrder: task.sortOrder,
            },
          })
          taskCount++

          // Duplicate subtasks
          for (const sub of task.subtasks) {
            const subFolderId = sub.folderId ? (folderIdMap.get(sub.folderId) || null) : null
            await tx.task.create({
              data: {
                title: applyReplace(sub.title),
                description: sub.description ? applyReplace(sub.description) : null,
                priority: sub.priority,
                status: 'TODO',
                projectId: newProject.id,
                parentId: newTask.id,
                folderId: subFolderId,
                creatorId: context.userId,
                assigneeId: sub.assigneeId,
                dueDate: sub.dueDate,
              },
            })
            subtaskCount++
          }
        }

        return {
          project: newProject,
          membersAdded: source.members.length,
          foldersCreated: folderIdMap.size,
          tasksCreated: taskCount,
          subtasksCreated: subtaskCount,
        }
      })

      return { success: true, data: result }
    },
  },

  // --- search_users ---
  {
    name: 'search_users',
    description: 'Cerca utenti nel sistema per nome, cognome, email o username. Utile per trovare l\'ID utente prima di operazioni come add_project_member.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Termine di ricerca (nome, cognome, email o username)' },
      },
      required: ['query'],
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const query = (input.query as string).trim()
      if (query.length < 2) return { success: false, error: 'Query troppo corta (min 2 caratteri)' }

      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { username: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          jobTitle: true,
        },
        take: 10,
      })

      return { success: true, data: { users, total: users.length } }
    },
  },
]
