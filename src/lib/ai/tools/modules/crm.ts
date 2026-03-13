import crypto from 'crypto'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'
import type { AiToolDefinition, AiToolInput, AiToolContext } from '../types'

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

async function getOrRecalcHealth(clientId: string) {
  const existing = await prisma.clientHealthScore.findUnique({ where: { clientId } })
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  if (existing && existing.lastCalculatedAt > twentyFourHoursAgo) return existing
  // Recalculate if stale
  const { updateClientHealthScore } = await import('@/lib/crm/health-score')
  await updateClientHealthScore(clientId)
  return prisma.clientHealthScore.findUnique({ where: { clientId } })
}

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
      if (input.expectedCloseDate) {
        const parsedDate = parseDate(input.expectedCloseDate)
        if (!parsedDate) return { success: false, error: 'Data non valida' }
        data.expectedCloseDate = parsedDate
      }
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
          expectedCloseDate: input.expectedCloseDate ? (parseDate(input.expectedCloseDate) ?? null) : null,
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

  {
    name: 'get_client_details',
    description: 'Ottieni tutti i dettagli di un cliente: contatti, deal, progetti, fatturato, ticket.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID del cliente (obbligatorio)' },
      },
      required: ['clientId'],
    },
    module: 'crm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const client = await prisma.client.findUnique({
        where: { id: input.clientId as string },
        include: {
          contacts: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isPrimary: true },
            orderBy: { isPrimary: 'desc' },
          },
          deals: {
            select: { id: true, title: true, value: true, stage: true, probability: true, expectedCloseDate: true },
            orderBy: { updatedAt: 'desc' },
            take: 10,
          },
          _count: { select: { projects: true, quotes: true, tickets: true, interactions: true, documents: true } },
        },
      })

      if (!client) return { success: false, error: 'Cliente non trovato' }

      return {
        success: true,
        data: {
          ...client,
          totalRevenue: client.totalRevenue.toString(),
          deals: client.deals.map((d) => ({ ...d, value: d.value.toString() })),
        },
      }
    },
  },

  {
    name: 'get_deal_details',
    description: 'Ottieni i dettagli completi di un deal: valore, fase, probabilità, cliente, contatto, owner.',
    input_schema: {
      type: 'object',
      properties: {
        dealId: { type: 'string', description: 'ID del deal (obbligatorio)' },
      },
      required: ['dealId'],
    },
    module: 'crm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const deal = await prisma.deal.findUnique({
        where: { id: input.dealId as string },
        include: {
          client: { select: { id: true, companyName: true, status: true } },
          lead: { select: { id: true, name: true, email: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
      })

      if (!deal) return { success: false, error: 'Deal non trovato' }

      return { success: true, data: { ...deal, value: deal.value.toString() } }
    },
  },

  // --- create_contact ---
  {
    name: 'create_contact',
    description: 'Crea un nuovo contatto per un cliente CRM',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID del cliente' },
        firstName: { type: 'string', description: 'Nome' },
        lastName: { type: 'string', description: 'Cognome' },
        email: { type: 'string', description: 'Email (opzionale)' },
        phone: { type: 'string', description: 'Telefono (opzionale)' },
        role: { type: 'string', description: 'Ruolo/posizione (opzionale)' },
        isPrimary: { type: 'boolean', description: 'Contatto primario?' },
      },
      required: ['clientId', 'firstName', 'lastName'],
    },
    module: 'crm',
    requiredPermission: 'write',
    execute: async (input) => {
      const contact = await prisma.contact.create({
        data: {
          clientId: input.clientId as string,
          firstName: input.firstName as string,
          lastName: input.lastName as string,
          email: (input.email as string) || undefined,
          phone: (input.phone as string) || undefined,
          role: (input.role as string) || undefined,
          isPrimary: (input.isPrimary as boolean) || false,
        },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isPrimary: true },
      })
      return { success: true, data: contact }
    },
  },

  // --- update_contact ---
  {
    name: 'update_contact',
    description: 'Aggiorna un contatto CRM esistente',
    input_schema: {
      type: 'object',
      properties: {
        contactId: { type: 'string', description: 'ID del contatto' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        role: { type: 'string' },
        isPrimary: { type: 'boolean' },
      },
      required: ['contactId'],
    },
    module: 'crm',
    requiredPermission: 'write',
    execute: async (input) => {
      const data: Record<string, unknown> = {}
      if (input.firstName) data.firstName = input.firstName
      if (input.lastName) data.lastName = input.lastName
      if (input.email !== undefined) data.email = input.email || null
      if (input.phone !== undefined) data.phone = input.phone || null
      if (input.role !== undefined) data.role = input.role || null
      if (input.isPrimary !== undefined) data.isPrimary = input.isPrimary

      const contact = await prisma.contact.update({
        where: { id: input.contactId as string },
        data,
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, isPrimary: true },
      })
      return { success: true, data: contact }
    },
  },

  // --- list_interactions ---
  {
    name: 'list_interactions',
    description: 'Lista le interazioni (chiamate, email, meeting, note) di un cliente o contatto',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID cliente (opzionale)' },
        contactId: { type: 'string', description: 'ID contatto (opzionale)' },
        type: { type: 'string', description: 'Tipo: CALL, EMAIL, MEETING, NOTE, WHATSAPP, SOCIAL' },
        limit: { type: 'number', description: 'Max risultati (default 20)' },
      },
    },
    module: 'crm',
    requiredPermission: 'read',
    execute: async (input) => {
      const where: Record<string, unknown> = {}
      if (input.clientId) where.clientId = input.clientId
      if (input.contactId) where.contactId = input.contactId
      if (input.type) where.type = input.type

      const interactions = await prisma.interaction.findMany({
        where,
        orderBy: { date: 'desc' },
        take: (input.limit as number) || 20,
        select: {
          id: true, type: true, subject: true, content: true, date: true,
          client: { select: { id: true, companyName: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
        },
      })
      return { success: true, data: { interactions, total: interactions.length } }
    },
  },

  // --- get_lead_details ---
  {
    name: 'get_lead_details',
    description: 'Ottieni dettagli completi di un lead',
    input_schema: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID del lead' },
      },
      required: ['leadId'],
    },
    module: 'crm',
    requiredPermission: 'read',
    execute: async (input) => {
      const lead = await prisma.lead.findUnique({
        where: { id: input.leadId as string },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
          convertedClient: { select: { id: true, companyName: true } },
          deals: { select: { id: true, title: true, stage: true, value: true } },
        },
      })
      if (!lead) return { success: false, error: 'Lead non trovato' }
      const deals = lead.deals.map((d) => ({ ...d, value: d.value.toString() }))
      return { success: true, data: { ...lead, deals } }
    },
  },

  // --- convert_lead ---
  {
    name: 'convert_lead',
    description: 'Converte un lead in cliente CRM. Crea un nuovo Client e aggiorna il lead.',
    input_schema: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'ID del lead da convertire' },
        companyName: { type: 'string', description: 'Nome azienda per il nuovo cliente (opzionale, usa lead.company)' },
      },
      required: ['leadId'],
    },
    module: 'crm',
    requiredPermission: 'write',
    execute: async (input) => {
      const lead = await prisma.lead.findUnique({ where: { id: input.leadId as string } })
      if (!lead) return { success: false, error: 'Lead non trovato' }
      if (lead.convertedClientId) return { success: false, error: 'Lead già convertito' }

      const companyName = (input.companyName as string) || lead.company || lead.name
      const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

      let client: { id: string; companyName: string }
      try {
        client = await prisma.client.create({
          data: {
            companyName,
            slug: `${slug}-${crypto.randomUUID().slice(0, 8)}`,
            source: lead.source,
            status: 'ACTIVE',
            contacts: {
              create: {
                firstName: lead.name.split(' ')[0] || lead.name,
                lastName: lead.name.split(' ').slice(1).join(' ') || '',
                email: lead.email,
                phone: lead.phone || undefined,
                isPrimary: true,
              },
            },
          },
          select: { id: true, companyName: true },
        })
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          return { success: false, error: 'Slug duplicato, riprovare' }
        }
        throw e
      }

      await prisma.lead.update({
        where: { id: lead.id },
        data: { convertedClientId: client.id, status: 'CONVERTED' },
      })

      return { success: true, data: { client, leadId: lead.id, status: 'CONVERTED' } }
    },
  },

  // --- get_client_health ---
  {
    name: 'get_client_health',
    description: 'Ottieni l\'health score di un cliente con breakdown dei sub-score e livello di rischio.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID del cliente (obbligatorio)' },
      },
      required: ['clientId'],
    },
    module: 'crm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const health = await getOrRecalcHealth(input.clientId as string)
      if (!health) return { success: false, error: 'Health score non disponibile' }
      return {
        success: true,
        data: {
          overallScore: health.overallScore,
          riskLevel: health.riskLevel,
          interactionScore: health.interactionScore,
          pipelineScore: health.pipelineScore,
          projectScore: health.projectScore,
          revenueScore: health.revenueScore,
          engagementScore: health.engagementScore,
          lastCalculatedAt: health.lastCalculatedAt,
          nextActions: health.nextActions,
        },
      }
    },
  },

  // --- get_at_risk_clients ---
  {
    name: 'get_at_risk_clients',
    description: 'Lista i clienti a rischio (AT_RISK, CRITICAL, CHURNING) ordinati per score crescente.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Numero massimo risultati (default: 10)' },
      },
    },
    module: 'crm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const limit = Math.min(Number(input.limit) || 10, 30)
      const atRisk = await prisma.clientHealthScore.findMany({
        where: { riskLevel: { in: ['AT_RISK', 'CRITICAL', 'CHURNING'] } },
        orderBy: { overallScore: 'asc' },
        take: limit,
        select: {
          overallScore: true,
          riskLevel: true,
          interactionScore: true,
          pipelineScore: true,
          lastCalculatedAt: true,
          nextActions: true,
          client: { select: { id: true, companyName: true, status: true, totalRevenue: true } },
        },
      })
      return {
        success: true,
        data: {
          clients: atRisk.map((h) => ({
            ...h,
            client: { ...h.client, totalRevenue: h.client.totalRevenue.toString() },
          })),
          total: atRisk.length,
        },
      }
    },
  },

  // --- list_ai_suggestions ---
  {
    name: 'list_ai_suggestions',
    description: 'Lista i suggerimenti AI proattivi per clienti (follow-up, opportunità, rischi churn).',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'Filtra per cliente specifico' },
        type: { type: 'string', description: 'Filtra per tipo: FOLLOWUP, OPPORTUNITY, CHURN_RISK, TOUCHPOINT' },
        limit: { type: 'number', description: 'Max risultati (default: 10)' },
      },
    },
    module: 'crm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const { brand } = await import('@/lib/branding')
      const limit = Math.min(Number(input.limit) || 10, 30)
      const where: Record<string, unknown> = { brandSlug: brand.slug, status: 'PENDING' }
      if (input.clientId) where.clientId = input.clientId
      if (input.type) where.type = input.type

      const suggestions = await prisma.aiSuggestion.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        select: {
          id: true, type: true, title: true, description: true,
          priority: true, actionType: true, status: true,
          client: { select: { id: true, companyName: true } },
        },
      })
      return { success: true, data: { suggestions, total: suggestions.length } }
    },
  },

  // --- accept_ai_suggestion ---
  {
    name: 'accept_ai_suggestion',
    description: 'Accetta o ignora un suggerimento AI.',
    input_schema: {
      type: 'object',
      properties: {
        suggestionId: { type: 'string', description: 'ID del suggerimento (obbligatorio)' },
        action: { type: 'string', description: 'ACCEPTED o DISMISSED (obbligatorio)' },
      },
      required: ['suggestionId', 'action'],
    },
    module: 'crm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const status = input.action as string
      if (!['ACCEPTED', 'DISMISSED'].includes(status)) {
        return { success: false, error: 'Azione non valida. Usa ACCEPTED o DISMISSED.' }
      }
      const suggestion = await prisma.aiSuggestion.update({
        where: { id: input.suggestionId as string },
        data: { status, acceptedById: status === 'ACCEPTED' ? context.userId : null },
        select: { id: true, title: true, status: true, actionType: true },
      })
      return { success: true, data: suggestion }
    },
  },

  // --- generate_client_briefing ---
  {
    name: 'generate_client_briefing',
    description: 'Genera un briefing pre-meeting dettagliato per un cliente.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID del cliente (obbligatorio)' },
      },
      required: ['clientId'],
    },
    module: 'crm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const { generateClientBriefing } = await import('@/lib/crm/ai-suggestions')
      const briefing = await generateClientBriefing(input.clientId as string)
      return { success: true, data: { briefing } }
    },
  },

  // Phase 4: Service Catalog & Cross-sell
  {
    name: 'list_services',
    description: 'Lista i servizi del catalogo del brand corrente.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filtra per categoria (opzionale)' },
      },
    },
    module: 'crm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const { brand } = await import('@/lib/branding')
      const where: Record<string, unknown> = { brandSlug: brand.slug, isActive: true }
      if (input.category) where.category = input.category
      const services = await prisma.serviceCatalog.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, category: true, description: true, priceType: true, priceMin: true, priceMax: true, tags: true },
      })
      return { success: true, data: services }
    },
  },
  {
    name: 'get_client_services',
    description: 'Lista i servizi attivi di un cliente specifico.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID del cliente (obbligatorio)' },
      },
      required: ['clientId'],
    },
    module: 'crm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const services = await prisma.clientService.findMany({
        where: { clientId: input.clientId as string },
        include: { service: { select: { name: true, category: true, priceType: true } } },
      })
      return { success: true, data: services }
    },
  },
  {
    name: 'get_cross_sell_suggestions',
    description: 'Genera suggerimenti di cross-sell AI per un cliente basandosi sul suo profilo e servizi attivi.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID del cliente (obbligatorio)' },
      },
      required: ['clientId'],
    },
    module: 'crm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const { generateCrossSellSuggestions } = await import('@/lib/crm/cross-sell-engine')
      const suggestions = await generateCrossSellSuggestions(input.clientId as string)
      return { success: true, data: suggestions }
    },
  },
  {
    name: 'assign_service_to_client',
    description: 'Assegna un servizio del catalogo a un cliente.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID del cliente' },
        serviceId: { type: 'string', description: 'ID del servizio dal catalogo' },
        value: { type: 'number', description: 'Valore del servizio (opzionale)' },
        notes: { type: 'string', description: 'Note aggiuntive (opzionale)' },
      },
      required: ['clientId', 'serviceId'],
    },
    module: 'crm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, _ctx: AiToolContext) => {
      const cs = await prisma.clientService.create({
        data: {
          clientId: input.clientId as string,
          serviceId: input.serviceId as string,
          value: input.value ? new Prisma.Decimal(input.value as number) : null,
          notes: (input.notes as string) || null,
          startDate: new Date(),
        },
        include: { service: { select: { name: true } } },
      })
      return { success: true, data: cs }
    },
  },

  // Phase 5: Communication Center
  {
    name: 'compose_email',
    description: 'Genera un\'email AI personalizzata per un cliente. Scenari: followup, reengagement, thank_you, project_update, proposta_consulenza, presentazione_servizi, richiesta_feedback, invito_evento, proposta_collaborazione, custom.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID del cliente (obbligatorio)' },
        scenario: { type: 'string', description: 'Scenario email (obbligatorio)' },
        contactId: { type: 'string', description: 'ID del contatto destinatario (opzionale, usa primario)' },
        customPrompt: { type: 'string', description: 'Prompt personalizzato (solo per scenario custom)' },
        send: { type: 'boolean', description: 'Se true, invia immediatamente l\'email (default: false)' },
      },
      required: ['clientId', 'scenario'],
    },
    module: 'crm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const { composeEmail } = await import('@/lib/crm/email-composer')
      const composed = await composeEmail({
        clientId: input.clientId as string,
        contactId: input.contactId as string | undefined,
        scenario: input.scenario as 'followup',
        customPrompt: input.customPrompt as string | undefined,
      })

      if (input.send) {
        const { sendViaSMTP } = await import('@/lib/email')
        const sent = await sendViaSMTP(composed.contactEmail, composed.subject, composed.bodyHtml)
        await prisma.campaignSend.create({
          data: {
            campaignName: `ai-agent-${input.scenario}`,
            clientId: input.clientId as string,
            contactId: composed.contactId,
            contactEmail: composed.contactEmail,
            subject: composed.subject,
            bodyHtml: composed.bodyHtml,
            scenario: input.scenario as string,
            status: sent ? 'SENT' : 'FAILED',
            sentAt: sent ? new Date() : null,
            sentById: context.userId,
          },
        })
        await prisma.interaction.create({
          data: {
            clientId: input.clientId as string,
            contactId: composed.contactId,
            type: 'EMAIL',
            subject: `Email inviata: ${composed.subject}`,
            content: `Destinatario: ${composed.contactEmail} | Scenario: ${input.scenario} | Via: AI Agent`,
          },
        })
        return { success: true, data: { ...composed, sent, status: sent ? 'SENT' : 'FAILED' } }
      }

      return { success: true, data: composed }
    },
  },
  {
    name: 'get_communication_history',
    description: 'Cronologia comunicazioni email inviate a un cliente.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID del cliente (obbligatorio)' },
        limit: { type: 'number', description: 'Max risultati (default 10)' },
      },
      required: ['clientId'],
    },
    module: 'crm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const limit = Math.min(Number(input.limit) || 10, 30)
      const sends = await prisma.campaignSend.findMany({
        where: { clientId: input.clientId as string },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true, campaignName: true, contactEmail: true, subject: true,
          scenario: true, status: true, sentAt: true, createdAt: true,
          sentBy: { select: { firstName: true, lastName: true } },
        },
      })
      return { success: true, data: { communications: sends, total: sends.length } }
    },
  },
  {
    name: 'suggest_communication_plan',
    description: 'Genera un piano di comunicazione AI personalizzato per un cliente con 3-5 step.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'ID del cliente (obbligatorio)' },
      },
      required: ['clientId'],
    },
    module: 'crm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const { generateCommunicationPlan } = await import('@/lib/crm/communication-planner')
      const plan = await generateCommunicationPlan(input.clientId as string)
      return { success: true, data: plan }
    },
  },
]
