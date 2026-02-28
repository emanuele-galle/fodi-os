import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'
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

  {
    name: 'create_deal',
    description: 'Crea una nuova trattativa (deal) nella pipeline commerciale con titolo, valore, cliente e fase.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titolo della trattativa (obbligatorio)' },
        value: { type: 'number', description: 'Valore in euro (default: 0)' },
        stage: { type: 'string', description: 'Fase: QUALIFICATION, PROPOSAL, NEGOTIATION (default: QUALIFICATION)' },
        probability: { type: 'number', description: 'Probabilità di chiusura 0-100 (default: 50)' },
        clientId: { type: 'string', description: 'ID del cliente associato' },
        contactId: { type: 'string', description: 'ID del contatto di riferimento' },
        description: { type: 'string', description: 'Descrizione della trattativa' },
        expectedCloseDate: { type: 'string', description: 'Data chiusura prevista (ISO 8601)' },
      },
      required: ['title'],
    },
    module: 'crm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const deal = await prisma.deal.create({
        data: {
          title: input.title as string,
          description: (input.description as string) || null,
          value: input.value ? input.value as number : 0,
          stage: (input.stage as 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION') || 'QUALIFICATION',
          probability: input.probability !== undefined ? Number(input.probability) : 50,
          clientId: (input.clientId as string) || null,
          contactId: (input.contactId as string) || null,
          expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate as string) : null,
          ownerId: context.userId,
        },
        select: { id: true, title: true, stage: true, value: true },
      })

      return { success: true, data: deal }
    },
  },

  {
    name: 'create_client',
    description: 'Crea un nuovo cliente nel CRM con nome azienda, P.IVA, settore, sito web e note.',
    input_schema: {
      type: 'object',
      properties: {
        companyName: { type: 'string', description: 'Nome azienda (obbligatorio)' },
        vatNumber: { type: 'string', description: 'Partita IVA' },
        fiscalCode: { type: 'string', description: 'Codice fiscale' },
        pec: { type: 'string', description: 'PEC' },
        sdi: { type: 'string', description: 'Codice SDI (fatturazione elettronica)' },
        website: { type: 'string', description: 'Sito web' },
        industry: { type: 'string', description: 'Settore/industria' },
        source: { type: 'string', description: 'Sorgente acquisizione (es. referral, web, social)' },
        status: { type: 'string', description: 'Stato: LEAD, PROSPECT, ACTIVE (default: ACTIVE)' },
        notes: { type: 'string', description: 'Note aggiuntive' },
      },
      required: ['companyName'],
    },
    module: 'crm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const companyName = input.companyName as string
      const slug = slugify(companyName)

      // Check slug uniqueness
      const existing = await prisma.client.findUnique({ where: { slug } })
      if (existing) {
        return { success: false, error: `Esiste già un cliente con slug "${slug}". Controlla se il cliente esiste già.` }
      }

      const client = await prisma.client.create({
        data: {
          companyName,
          slug,
          vatNumber: (input.vatNumber as string) || null,
          fiscalCode: (input.fiscalCode as string) || null,
          pec: (input.pec as string) || null,
          sdi: (input.sdi as string) || null,
          website: (input.website as string) || null,
          industry: (input.industry as string) || null,
          source: (input.source as string) || null,
          status: (input.status as 'LEAD' | 'PROSPECT' | 'ACTIVE') || 'ACTIVE',
          notes: (input.notes as string) || null,
        },
        select: { id: true, companyName: true, slug: true, status: true },
      })

      return { success: true, data: client }
    },
  },

  {
    name: 'update_client',
    description: 'Aggiorna i dati di un cliente esistente (stato, settore, P.IVA, note, ecc.).',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID del cliente (obbligatorio)' },
        companyName: { type: 'string', description: 'Nuovo nome azienda' },
        status: { type: 'string', description: 'Nuovo stato: LEAD, PROSPECT, ACTIVE, INACTIVE, CHURNED' },
        vatNumber: { type: 'string', description: 'Partita IVA' },
        pec: { type: 'string', description: 'PEC' },
        sdi: { type: 'string', description: 'Codice SDI' },
        website: { type: 'string', description: 'Sito web' },
        industry: { type: 'string', description: 'Settore' },
        notes: { type: 'string', description: 'Note' },
      },
      required: ['clientId'],
    },
    module: 'crm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput) => {
      const data: Record<string, unknown> = {}
      if (input.companyName) data.companyName = input.companyName
      if (input.status) data.status = input.status
      if (input.vatNumber !== undefined) data.vatNumber = input.vatNumber || null
      if (input.pec !== undefined) data.pec = input.pec || null
      if (input.sdi !== undefined) data.sdi = input.sdi || null
      if (input.website !== undefined) data.website = input.website || null
      if (input.industry !== undefined) data.industry = input.industry || null
      if (input.notes !== undefined) data.notes = input.notes || null

      const client = await prisma.client.update({
        where: { id: input.clientId as string },
        data,
        select: { id: true, companyName: true, status: true },
      })

      return { success: true, data: client }
    },
  },
]
