import { prisma } from '@/lib/prisma'
import type { AiToolDefinition, AiToolInput, AiToolContext } from '../types'

export const crmTools: AiToolDefinition[] = [
  {
    name: 'list_leads',
    description: 'Lista i lead (contatti potenziali) con filtro per stato. Restituisce nome, email, azienda, stato, sorgente.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filtra per stato: NEW, CONTACTED, QUALIFIED, PROPOSAL, WON, LOST' },
        limit: { type: 'number', description: 'Numero massimo risultati (default: 20, max: 50)' },
      },
    },
    module: 'crm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const limit = Math.min(Number(input.limit) || 20, 50)
      const where: Record<string, unknown> = {}
      if (input.status) where.status = input.status

      const leads = await prisma.lead.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          phone: true,
          status: true,
          source: true,
          assignee: { select: { id: true, firstName: true, lastName: true } },
          createdAt: true,
        },
      })

      return { success: true, data: { leads, total: leads.length } }
    },
  },

  {
    name: 'create_lead',
    description: 'Crea un nuovo lead nel CRM con nome, email, azienda, telefono e messaggio.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome completo (obbligatorio)' },
        email: { type: 'string', description: 'Email (obbligatorio)' },
        company: { type: 'string', description: 'Nome azienda' },
        phone: { type: 'string', description: 'Telefono' },
        message: { type: 'string', description: 'Note o messaggio iniziale' },
        source: { type: 'string', description: 'Sorgente: website, referral, social, manual (default: manual)' },
      },
      required: ['name', 'email'],
    },
    module: 'crm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const lead = await prisma.lead.create({
        data: {
          name: input.name as string,
          email: input.email as string,
          company: (input.company as string) || null,
          phone: (input.phone as string) || null,
          message: (input.message as string) || '',
          source: (input.source as string) || 'manual',
          assigneeId: context.userId,
        },
      })

      return { success: true, data: { id: lead.id, name: lead.name, status: lead.status } }
    },
  },

  {
    name: 'update_lead_status',
    description: 'Aggiorna lo stato di un lead nel CRM.',
    input_schema: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID del lead (obbligatorio)' },
        status: { type: 'string', description: 'Nuovo stato: NEW, CONTACTED, QUALIFIED, PROPOSAL, WON, LOST (obbligatorio)' },
        notes: { type: 'string', description: 'Note aggiuntive' },
      },
      required: ['leadId', 'status'],
    },
    module: 'crm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const data: Record<string, unknown> = { status: input.status }
      if (input.notes) data.notes = input.notes

      const lead = await prisma.lead.update({
        where: { id: input.leadId as string },
        data,
        select: { id: true, name: true, status: true },
      })

      return { success: true, data: lead }
    },
  },

  {
    name: 'list_deals',
    description: 'Lista le trattative (deals) nella pipeline commerciale. Filtra per fase e proprietario.',
    input_schema: {
      type: 'object',
      properties: {
        stage: { type: 'string', description: 'Fase: QUALIFICATION, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST' },
        ownerId: { type: 'string', description: 'ID del proprietario della trattativa' },
        limit: { type: 'number', description: 'Numero massimo risultati (default: 20, max: 50)' },
      },
    },
    module: 'crm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const limit = Math.min(Number(input.limit) || 20, 50)
      const where: Record<string, unknown> = {}
      if (input.stage) where.stage = input.stage
      if (input.ownerId) where.ownerId = input.ownerId

      const deals = await prisma.deal.findMany({
        where,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          value: true,
          stage: true,
          probability: true,
          expectedCloseDate: true,
          client: { select: { id: true, companyName: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
      })

      return { success: true, data: { deals, total: deals.length } }
    },
  },

  {
    name: 'update_deal',
    description: 'Aggiorna una trattativa (deal): fase, valore, probabilità, data chiusura prevista.',
    input_schema: {
      type: 'object',
      properties: {
        dealId: { type: 'string', description: 'ID della trattativa (obbligatorio)' },
        stage: { type: 'string', description: 'Nuova fase: QUALIFICATION, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST' },
        value: { type: 'number', description: 'Nuovo valore in euro' },
        probability: { type: 'number', description: 'Probabilità di chiusura (0-100)' },
        expectedCloseDate: { type: 'string', description: 'Data chiusura prevista (ISO 8601)' },
      },
      required: ['dealId'],
    },
    module: 'crm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const data: Record<string, unknown> = {}
      if (input.stage) data.stage = input.stage
      if (input.value !== undefined) data.value = input.value
      if (input.probability !== undefined) data.probability = input.probability
      if (input.expectedCloseDate) data.expectedCloseDate = new Date(input.expectedCloseDate as string)
      if (input.stage === 'CLOSED_WON' || input.stage === 'CLOSED_LOST') {
        data.actualCloseDate = new Date()
      }

      const deal = await prisma.deal.update({
        where: { id: input.dealId as string },
        data,
        select: { id: true, title: true, stage: true, value: true },
      })

      return { success: true, data: deal }
    },
  },

  {
    name: 'list_clients',
    description: 'Lista i clienti del CRM con filtro per stato. Restituisce nome azienda, stato, settore, fatturato.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filtra per stato: LEAD, PROSPECT, ACTIVE, INACTIVE, CHURNED' },
        search: { type: 'string', description: 'Cerca per nome azienda' },
        limit: { type: 'number', description: 'Numero massimo risultati (default: 20, max: 50)' },
      },
    },
    module: 'crm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const limit = Math.min(Number(input.limit) || 20, 50)
      const where: Record<string, unknown> = {}
      if (input.status) where.status = input.status
      if (input.search) where.companyName = { contains: input.search, mode: 'insensitive' }

      const clients = await prisma.client.findMany({
        where,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          companyName: true,
          status: true,
          industry: true,
          totalRevenue: true,
          _count: { select: { contacts: true, projects: true, deals: true } },
        },
      })

      return { success: true, data: { clients, total: clients.length } }
    },
  },

  {
    name: 'search_contacts',
    description: 'Cerca contatti specifici nel CRM per nome, email o telefono. Restituisce contatti con il cliente associato.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Termine di ricerca (nome, email o telefono)' },
        limit: { type: 'number', description: 'Numero massimo risultati (default: 10)' },
      },
      required: ['query'],
    },
    module: 'crm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const query = (input.query as string).trim()
      if (query.length < 2) return { success: false, error: 'Query troppo corta' }
      const limit = Math.min(Number(input.limit) || 10, 30)

      const contacts = await prisma.contact.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          client: { select: { id: true, companyName: true } },
        },
      })

      return { success: true, data: { contacts, total: contacts.length } }
    },
  },

  {
    name: 'log_interaction',
    description: 'Registra un\'interazione con un cliente (chiamata, email, riunione, nota).',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID del cliente (obbligatorio)' },
        type: { type: 'string', description: 'Tipo: CALL, EMAIL, MEETING, NOTE, WHATSAPP, SOCIAL (obbligatorio)' },
        subject: { type: 'string', description: 'Oggetto dell\'interazione (obbligatorio)' },
        content: { type: 'string', description: 'Contenuto/note dell\'interazione' },
        contactId: { type: 'string', description: 'ID del contatto specifico' },
      },
      required: ['clientId', 'type', 'subject'],
    },
    module: 'crm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const interaction = await prisma.interaction.create({
        data: {
          clientId: input.clientId as string,
          type: input.type as 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'WHATSAPP' | 'SOCIAL',
          subject: input.subject as string,
          content: (input.content as string) || null,
          contactId: (input.contactId as string) || null,
        },
      })

      return { success: true, data: { id: interaction.id, type: interaction.type, subject: interaction.subject } }
    },
  },
]
