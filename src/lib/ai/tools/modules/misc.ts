import { prisma } from '@/lib/prisma'
import type { AiToolDefinition, AiToolInput, AiToolContext } from '../types'

export const miscTools: AiToolDefinition[] = [
  {
    name: 'get_company_profile',
    description: 'Ottieni il profilo aziendale: ragione sociale, P.IVA, indirizzo, IBAN, contatti.',
    input_schema: {
      type: 'object',
      properties: {},
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async () => {
      const profile = await prisma.companyProfile.findFirst()
      if (!profile) return { success: false, error: 'Profilo aziendale non configurato' }
      return { success: true, data: profile }
    },
  },

  {
    name: 'list_activity_log',
    description: 'Mostra lo storico attività recenti, filtrabili per utente, tipo entità o azione.',
    input_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Filtra per utente' },
        entityType: { type: 'string', description: 'Filtra per tipo entità (es. task, project, client, deal)' },
        action: { type: 'string', description: 'Filtra per azione (es. create, update, delete)' },
        limit: { type: 'number', description: 'Numero massimo risultati (default: 20)' },
      },
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const limit = Math.min(Number(input.limit) || 20, 50)
      const where: Record<string, unknown> = {}

      if (input.userId) where.userId = input.userId
      if (input.entityType) where.entityType = input.entityType
      if (input.action) where.action = input.action

      const logs = await prisma.activityLog.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
      })

      return { success: true, data: { logs, total: logs.length } }
    },
  },

  {
    name: 'clock_in',
    description: 'Registra l\'inizio della sessione di lavoro (clock in).',
    input_schema: {
      type: 'object',
      properties: {
        notes: { type: 'string', description: 'Note opzionali sulla sessione' },
      },
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      // Check if already clocked in
      const active = await prisma.workSession.findFirst({
        where: { userId: context.userId, clockOut: null },
      })
      if (active) {
        return { success: false, error: 'Hai già una sessione attiva. Fai clock out prima di iniziarne una nuova.' }
      }

      const session = await prisma.workSession.create({
        data: {
          userId: context.userId,
          notes: (input.notes as string) || null,
        },
        select: { id: true, clockIn: true, notes: true },
      })

      return { success: true, data: session }
    },
  },

  {
    name: 'clock_out',
    description: 'Registra la fine della sessione di lavoro (clock out).',
    input_schema: {
      type: 'object',
      properties: {
        notes: { type: 'string', description: 'Note opzionali di chiusura' },
      },
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const active = await prisma.workSession.findFirst({
        where: { userId: context.userId, clockOut: null },
        orderBy: { clockIn: 'desc' },
      })

      if (!active) {
        return { success: false, error: 'Nessuna sessione attiva trovata. Fai clock in prima.' }
      }

      const now = new Date()
      const durationMins = Math.round((now.getTime() - active.clockIn.getTime()) / 60000)

      const session = await prisma.workSession.update({
        where: { id: active.id },
        data: {
          clockOut: now,
          durationMins,
          notes: input.notes ? `${active.notes || ''}\n${input.notes}`.trim() : active.notes,
        },
        select: { id: true, clockIn: true, clockOut: true, durationMins: true, notes: true },
      })

      return { success: true, data: session }
    },
  },

  {
    name: 'get_work_session_status',
    description: 'Mostra lo stato della sessione di lavoro corrente e le sessioni recenti.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Sessioni recenti da mostrare (default: 5)' },
      },
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const limit = Math.min(Number(input.limit) || 5, 20)

      const [active, recent] = await Promise.all([
        prisma.workSession.findFirst({
          where: { userId: context.userId, clockOut: null },
          select: { id: true, clockIn: true, notes: true },
        }),
        prisma.workSession.findMany({
          where: { userId: context.userId, clockOut: { not: null } },
          take: limit,
          orderBy: { clockIn: 'desc' },
          select: { id: true, clockIn: true, clockOut: true, durationMins: true, notes: true },
        }),
      ])

      return { success: true, data: { activeSession: active, recentSessions: recent } }
    },
  },

  {
    name: 'list_quote_templates',
    description: 'Lista i template di preventivo disponibili.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'Filtra per cliente specifico' },
      },
    },
    module: 'erp',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const where: Record<string, unknown> = { isActive: true }
      if (input.clientId) {
        where.OR = [
          { isGlobal: true },
          { clientId: input.clientId },
        ]
      } else {
        where.isGlobal = true
      }

      const templates = await prisma.quoteTemplate.findMany({
        where,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isGlobal: true,
          defaultTaxRate: true,
          defaultValidDays: true,
          _count: { select: { lineItems: true, quotes: true } },
          client: { select: { id: true, companyName: true } },
        },
      })

      return {
        success: true,
        data: {
          templates: templates.map((t) => ({ ...t, defaultTaxRate: t.defaultTaxRate.toString() })),
          total: templates.length,
        },
      }
    },
  },

  {
    name: 'list_wizard_submissions',
    description: 'Lista le risposte raccolte tramite wizard/moduli, filtrabili per stato o template.',
    input_schema: {
      type: 'object',
      properties: {
        templateId: { type: 'string', description: 'Filtra per template wizard' },
        status: { type: 'string', description: 'Filtra per stato: IN_PROGRESS, COMPLETED, ABANDONED' },
        limit: { type: 'number', description: 'Numero massimo risultati (default: 20)' },
      },
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput) => {
      const limit = Math.min(Number(input.limit) || 20, 50)
      const where: Record<string, unknown> = {}

      if (input.templateId) where.templateId = input.templateId
      if (input.status) where.status = input.status

      const submissions = await prisma.wizardSubmission.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          submitterName: true,
          submitterEmail: true,
          currentStep: true,
          answers: true,
          completedAt: true,
          createdAt: true,
          template: { select: { id: true, name: true } },
        },
      })

      return { success: true, data: { submissions, total: submissions.length } }
    },
  },
]
