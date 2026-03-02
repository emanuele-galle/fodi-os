import { prisma } from '@/lib/prisma'
import type { AiToolDefinition, AiToolInput, AiToolContext } from '../types'

export const folderTools: AiToolDefinition[] = [
  {
    name: 'list_project_folders',
    description: 'Lista le cartelle di un progetto in struttura ad albero, con conteggio task e allegati per cartella.',
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
      const folders = await prisma.folder.findMany({
        where: { projectId: input.projectId as string, parentId: null },
        include: {
          _count: { select: { tasks: true, attachments: true, links: true } },
          children: {
            include: {
              _count: { select: { tasks: true, attachments: true, links: true } },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      })

      return { success: true, data: { folders, total: folders.length } }
    },
  },

  {
    name: 'create_project_folder',
    description: 'Crea una nuova cartella in un progetto. Supporta max 2 livelli di profondità (cartella → sottocartella).',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del progetto (obbligatorio)' },
        name: { type: 'string', description: 'Nome della cartella (obbligatorio)' },
        description: { type: 'string', description: 'Descrizione della cartella' },
        color: { type: 'string', description: 'Colore esadecimale (#RRGGBB, default: #6366F1)' },
        parentId: { type: 'string', description: 'ID della cartella parent (per sottocartella)' },
      },
      required: ['projectId', 'name'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const projectId = input.projectId as string
      const parentId = (input.parentId as string) || null

      // Validate parent depth (max 2 levels)
      if (parentId) {
        const parent = await prisma.folder.findUnique({
          where: { id: parentId },
          select: { projectId: true, parentId: true },
        })
        if (!parent || parent.projectId !== projectId) {
          return { success: false, error: 'Cartella parent non trovata o non appartiene al progetto' }
        }
        if (parent.parentId) {
          return { success: false, error: 'Massimo 2 livelli di profondità consentiti' }
        }
      }

      const maxOrder = await prisma.folder.aggregate({
        where: { projectId, parentId },
        _max: { sortOrder: true },
      })

      const folder = await prisma.folder.create({
        data: {
          projectId,
          parentId,
          name: input.name as string,
          description: (input.description as string) || null,
          color: (input.color as string) || '#6366F1',
          sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        },
        include: {
          _count: { select: { tasks: true, attachments: true, links: true } },
        },
      })

      return { success: true, data: folder }
    },
  },

  {
    name: 'update_project_folder',
    description: 'Aggiorna una cartella: rinomina, cambia colore o descrizione.',
    input_schema: {
      type: 'object',
      properties: {
        folderId: { type: 'string', description: 'ID della cartella (obbligatorio)' },
        name: { type: 'string', description: 'Nuovo nome' },
        description: { type: 'string', description: 'Nuova descrizione (null per rimuovere)' },
        color: { type: 'string', description: 'Nuovo colore (#RRGGBB)' },
      },
      required: ['folderId'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const data: Record<string, unknown> = {}
      if (input.name) data.name = input.name
      if (input.description !== undefined) data.description = input.description || null
      if (input.color) data.color = input.color

      const folder = await prisma.folder.update({
        where: { id: input.folderId as string },
        data,
        select: { id: true, name: true, color: true, description: true },
      })

      return { success: true, data: folder }
    },
  },

  {
    name: 'delete_project_folder',
    description: 'Elimina una cartella. Task e allegati vengono sganciati (non eliminati), chat archiviate.',
    input_schema: {
      type: 'object',
      properties: {
        folderId: { type: 'string', description: 'ID della cartella da eliminare (obbligatorio)' },
      },
      required: ['folderId'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const folderId = input.folderId as string

      const folder = await prisma.folder.findUnique({
        where: { id: folderId },
        select: { id: true, name: true, projectId: true },
      })
      if (!folder) {
        return { success: false, error: 'Cartella non trovata' }
      }

      // Get all child folder IDs
      const children = await prisma.folder.findMany({
        where: { parentId: folderId },
        select: { id: true },
      })
      const allFolderIds = [folderId, ...children.map((c) => c.id)]

      // Unlink tasks and attachments, archive chat channels
      await prisma.task.updateMany({
        where: { folderId: { in: allFolderIds } },
        data: { folderId: null },
      })
      await prisma.projectAttachment.updateMany({
        where: { folderId: { in: allFolderIds } },
        data: { folderId: null },
      })
      await prisma.chatChannel.updateMany({
        where: { folderId: { in: allFolderIds } },
        data: { isArchived: true, folderId: null },
      })

      await prisma.folder.delete({
        where: { id: folderId },
      })

      return { success: true, data: { deleted: folder.name } }
    },
  },

  {
    name: 'list_folder_contents',
    description: 'Mostra il contenuto di una cartella: allegati e link salvati.',
    input_schema: {
      type: 'object',
      properties: {
        folderId: { type: 'string', description: 'ID della cartella (obbligatorio)' },
      },
      required: ['folderId'],
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const folderId = input.folderId as string

      const [folder, attachments, links] = await Promise.all([
        prisma.folder.findUnique({
          where: { id: folderId },
          select: { id: true, name: true, description: true, color: true },
        }),
        prisma.projectAttachment.findMany({
          where: { folderId },
          select: { id: true, fileName: true, mimeType: true, fileUrl: true, fileSize: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.projectLink.findMany({
          where: { folderId },
          select: { id: true, title: true, url: true, description: true, tags: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
      ])

      if (!folder) {
        return { success: false, error: 'Cartella non trovata' }
      }

      return {
        success: true,
        data: {
          folder,
          attachments,
          links,
          totals: { attachments: attachments.length, links: links.length },
        },
      }
    },
  },

  {
    name: 'add_project_link',
    description: 'Aggiunge un link URL a un progetto, opzionalmente dentro una cartella specifica.',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del progetto (obbligatorio)' },
        title: { type: 'string', description: 'Titolo del link (obbligatorio)' },
        url: { type: 'string', description: 'URL completo (obbligatorio)' },
        description: { type: 'string', description: 'Descrizione del link' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tag per categorizzare il link (es. ["competitor", "design"])',
        },
        folderId: { type: 'string', description: 'ID cartella dove salvare il link' },
      },
      required: ['projectId', 'title', 'url'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const link = await prisma.projectLink.create({
        data: {
          projectId: input.projectId as string,
          folderId: (input.folderId as string) || null,
          creatorId: context.userId,
          title: input.title as string,
          url: input.url as string,
          description: (input.description as string) || null,
          tags: (input.tags as string[]) || [],
        },
        select: {
          id: true,
          title: true,
          url: true,
          description: true,
          tags: true,
          folderId: true,
        },
      })

      return { success: true, data: link }
    },
  },

  {
    name: 'delete_project_link',
    description: 'Rimuove un link da un progetto.',
    input_schema: {
      type: 'object',
      properties: {
        linkId: { type: 'string', description: 'ID del link da eliminare (obbligatorio)' },
      },
      required: ['linkId'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const link = await prisma.projectLink.findUnique({
        where: { id: input.linkId as string },
        select: { id: true, title: true },
      })

      if (!link) {
        return { success: false, error: 'Link non trovato' }
      }

      await prisma.projectLink.delete({
        where: { id: input.linkId as string },
      })

      return { success: true, data: { deleted: link.title } }
    },
  },
]
