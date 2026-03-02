import { prisma } from '@/lib/prisma'
import type { AiToolDefinition, AiToolInput } from '../types'

export const documentTools: AiToolDefinition[] = [
  {
    name: 'list_documents',
    description: 'Lista documenti di un progetto o cliente, filtrabili per categoria.',
    input_schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Filtra per progetto' },
        clientId: { type: 'string', description: 'Filtra per cliente' },
        category: { type: 'string', description: 'Filtra per categoria (es. general, contract, invoice)' },
        limit: { type: 'number', description: 'Numero massimo risultati (default: 20)' },
      },
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const limit = Math.min(Number(input.limit) || 20, 50)
      const where: Record<string, unknown> = {}

      if (input.projectId) where.projectId = input.projectId
      if (input.clientId) where.clientId = input.clientId
      if (input.category) where.category = input.category

      const documents = await prisma.document.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          fileUrl: true,
          fileSize: true,
          mimeType: true,
          category: true,
          isClientVisible: true,
          createdAt: true,
          client: { select: { id: true, companyName: true } },
          project: { select: { id: true, name: true } },
        },
      })

      return { success: true, data: { documents, total: documents.length } }
    },
  },

  {
    name: 'get_document_details',
    description: 'Ottieni dettagli completi di un documento specifico.',
    input_schema: {
      type: 'object',
      properties: {
        documentId: { type: 'string', description: 'ID del documento (obbligatorio)' },
      },
      required: ['documentId'],
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const doc = await prisma.document.findUnique({
        where: { id: input.documentId as string },
        include: {
          client: { select: { id: true, companyName: true } },
          project: { select: { id: true, name: true } },
        },
      })

      if (!doc) return { success: false, error: 'Documento non trovato' }
      return { success: true, data: doc }
    },
  },
]
