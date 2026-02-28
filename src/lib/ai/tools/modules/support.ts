import { prisma } from '@/lib/prisma'
import type { AiToolDefinition, AiToolInput, AiToolContext } from '../types'

export const supportTools: AiToolDefinition[] = [
  {
    name: 'list_tickets',
    description: 'Lista i ticket di supporto con filtri per stato, priorità, assegnatario e cliente. Restituisce oggetto, stato, priorità, cliente, creatore, assegnatario e numero commenti.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filtra per stato: OPEN, IN_PROGRESS, WAITING_CLIENT, RESOLVED, CLOSED' },
        priority: { type: 'string', description: 'Filtra per priorità: LOW, MEDIUM, HIGH, URGENT' },
        assigneeId: { type: 'string', description: 'Filtra per ID assegnatario' },
        clientId: { type: 'string', description: 'Filtra per ID cliente' },
        limit: { type: 'number', description: 'Numero massimo risultati (default: 20, max: 50)' },
      },
    },
    module: 'support',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const limit = Math.min(Number(input.limit) || 20, 50)
      const where: Record<string, unknown> = {}
      if (input.status) where.status = input.status
      if (input.priority) where.priority = input.priority
      if (input.assigneeId) where.assigneeId = input.assigneeId
      if (input.clientId) where.clientId = input.clientId

      const tickets = await prisma.ticket.findMany({
        where,
        take: limit,
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        select: {
          id: true,
          number: true,
          subject: true,
          status: true,
          priority: true,
          category: true,
          createdAt: true,
          updatedAt: true,
          client: { select: { id: true, companyName: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { comments: true } },
        },
      })

      return { success: true, data: { tickets, total: tickets.length } }
    },
  },

  {
    name: 'get_ticket_details',
    description: 'Ottieni tutti i dettagli di un ticket di supporto, inclusi cliente, progetto, creatore, assegnatario e ultimi commenti.',
    input_schema: {
      type: 'object',
      properties: {
        ticketId: { type: 'string', description: 'ID del ticket (obbligatorio)' },
      },
      required: ['ticketId'],
    },
    module: 'support',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const ticket = await prisma.ticket.findUnique({
        where: { id: input.ticketId as string },
        include: {
          client: { select: { id: true, companyName: true } },
          project: { select: { id: true, name: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
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
        },
      })

      if (!ticket) return { success: false, error: 'Ticket non trovato' }
      return { success: true, data: ticket }
    },
  },

  {
    name: 'create_ticket',
    description: 'Crea un nuovo ticket di supporto con oggetto, descrizione, priorità, categoria, assegnatario e progetto.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID del cliente (obbligatorio)' },
        subject: { type: 'string', description: 'Oggetto del ticket (obbligatorio)' },
        description: { type: 'string', description: 'Descrizione dettagliata del problema (obbligatorio)' },
        priority: { type: 'string', description: 'Priorità: LOW, MEDIUM, HIGH, URGENT (default: MEDIUM)' },
        category: { type: 'string', description: 'Categoria: general, bug, feature, billing, access (default: general)' },
        assigneeId: { type: 'string', description: 'ID utente assegnatario' },
        projectId: { type: 'string', description: 'ID progetto associato' },
      },
      required: ['clientId', 'subject', 'description'],
    },
    module: 'support',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const now = new Date()
      const year = now.getFullYear()
      const lastTicket = await prisma.ticket.findFirst({
        where: { number: { startsWith: `TK-${year}-` } },
        orderBy: { number: 'desc' },
        select: { number: true },
      })
      const seq = lastTicket
        ? parseInt(lastTicket.number.split('-')[2], 10) + 1
        : 1
      const number = `TK-${year}-${String(seq).padStart(3, '0')}`

      const ticket = await prisma.ticket.create({
        data: {
          number,
          clientId: input.clientId as string,
          subject: input.subject as string,
          description: input.description as string,
          priority: (input.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') || 'MEDIUM',
          category: (input.category as string) || 'general',
          assigneeId: (input.assigneeId as string) || null,
          projectId: (input.projectId as string) || null,
          creatorId: context.userId,
        },
      })

      return { success: true, data: { id: ticket.id, number: ticket.number, subject: ticket.subject, status: ticket.status } }
    },
  },

  {
    name: 'update_ticket',
    description: 'Aggiorna un ticket di supporto: stato, assegnatario, priorità, categoria. Se lo stato diventa RESOLVED o CLOSED, registra la data di risoluzione.',
    input_schema: {
      type: 'object',
      properties: {
        ticketId: { type: 'string', description: 'ID del ticket da aggiornare (obbligatorio)' },
        status: { type: 'string', description: 'Nuovo stato: OPEN, IN_PROGRESS, WAITING_CLIENT, RESOLVED, CLOSED' },
        assigneeId: { type: 'string', description: 'Nuovo assegnatario (ID utente)' },
        priority: { type: 'string', description: 'Nuova priorità: LOW, MEDIUM, HIGH, URGENT' },
        category: { type: 'string', description: 'Nuova categoria' },
      },
      required: ['ticketId'],
    },
    module: 'support',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const data: Record<string, unknown> = {}
      if (input.status) data.status = input.status
      if (input.assigneeId) data.assigneeId = input.assigneeId
      if (input.priority) data.priority = input.priority
      if (input.category) data.category = input.category
      if (input.status === 'RESOLVED' || input.status === 'CLOSED') {
        data.resolvedAt = new Date()
      }

      const ticket = await prisma.ticket.update({
        where: { id: input.ticketId as string },
        data,
        select: { id: true, number: true, subject: true, status: true, priority: true },
      })

      return { success: true, data: ticket }
    },
  },
]
