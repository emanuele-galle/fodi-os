import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { anthropic } from '@/lib/ai/anthropic'
import type { Role } from '@/generated/prisma/client'

type Params = { params: Promise<{ dealId: string }> }

interface DealContext {
  deal: {
    title: string
    value: unknown
    stage: string
    probability: number | null
    description: string | null
    expectedCloseDate: Date | null
    client: { companyName: string } | null
    lead: { name: string; company: string | null } | null
    contact: { firstName: string; lastName: string } | null
    owner: { firstName: string; lastName: string } | null
  }
  interactions: Array<{ type: string; subject: string; content: string | null; date: Date }>
  tasks: Array<{ title: string; status: string; priority: string; dueDate: Date | null }>
  activities: Array<{ action: string; createdAt: Date }>
}

function formatDealHeader(deal: DealContext['deal']): string[] {
  const parts: string[] = []
  parts.push(`OPPORTUNITÀ: "${deal.title}"`)
  parts.push(`Valore: €${deal.value} | Fase: ${deal.stage} | Probabilità: ${deal.probability}%`)
  parts.push(`Owner: ${deal.owner?.firstName ?? ''} ${deal.owner?.lastName ?? ''}`.trim())
  if (deal.client) parts.push(`Cliente: ${deal.client.companyName}`)
  if (deal.lead) parts.push(`Lead: ${deal.lead.name}${deal.lead.company ? ` (${deal.lead.company})` : ''}`)
  if (deal.contact) parts.push(`Contatto: ${deal.contact.firstName} ${deal.contact.lastName}`)
  if (deal.expectedCloseDate) parts.push(`Chiusura prevista: ${new Date(deal.expectedCloseDate).toLocaleDateString('it-IT')}`)
  if (deal.description) parts.push(`Descrizione: ${deal.description}`)
  return parts
}

function formatInteractions(interactions: DealContext['interactions']): string[] {
  if (interactions.length === 0) return []
  return [
    '\nINTERAZIONI RECENTI:',
    ...interactions.map(i => {
      const date = new Date(i.date).toLocaleDateString('it-IT')
      return `- [${date}] ${i.type}: ${i.subject}${i.content ? ` — ${i.content.slice(0, 200)}` : ''}`
    }),
  ]
}

function formatTasks(tasks: DealContext['tasks']): string[] {
  if (tasks.length === 0) return []
  return [
    '\nTASK CORRELATI:',
    ...tasks.map(t => {
      const due = t.dueDate ? ` (scad. ${new Date(t.dueDate).toLocaleDateString('it-IT')})` : ''
      return `- [${t.status}] ${t.title} — ${t.priority}${due}`
    }),
  ]
}

function formatActivities(activities: DealContext['activities']): string[] {
  if (activities.length === 0) return []
  return [
    '\nATTIVITÀ RECENTI:',
    ...activities.map(a => `- [${new Date(a.createdAt).toLocaleDateString('it-IT')}] ${a.action}`),
  ]
}

function buildSummaryContext(ctx: DealContext): string {
  return [
    ...formatDealHeader(ctx.deal),
    ...formatInteractions(ctx.interactions),
    ...formatTasks(ctx.tasks),
    ...formatActivities(ctx.activities),
  ].join('\n')
}

async function fetchDealContextData(dealId: string, clientId: string | null) {
  return Promise.all([
    clientId
      ? prisma.interaction.findMany({
          where: { clientId },
          orderBy: { date: 'desc' },
          take: 20,
          select: { type: true, subject: true, content: true, date: true },
        })
      : Promise.resolve([]),

    prisma.task.findMany({
      where: {
        OR: [
          { tags: { has: `deal:${dealId}` } },
          ...(clientId ? [{ clientId }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: { title: true, status: true, priority: true, dueDate: true, createdAt: true },
    }),

    prisma.activityLog.findMany({
      where: { entityType: 'DEAL', entityId: dealId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { action: true, metadata: true, createdAt: true },
    }),
  ] as const)
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { dealId } = await params

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        client: { select: { id: true, companyName: true } },
        lead: { select: { id: true, name: true, company: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    if (!deal) {
      return NextResponse.json({ success: false, error: 'Opportunità non trovata' }, { status: 404 })
    }

    const [interactions, tasks, activities] = await fetchDealContextData(dealId, deal.clientId)
    const contextText = buildSummaryContext({ deal, interactions, tasks, activities })

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `Sei un assistente CRM. Genera un riepilogo conciso in italiano di questa opportunità commerciale, evidenziando:
1. Stato attuale e prossimi passi suggeriti
2. Punti di forza e rischi
3. Attività recenti rilevanti

Rispondi in massimo 4-5 frasi, diretto e utile. Non usare heading o elenchi puntati, solo testo fluido.

${contextText}`,
        },
      ],
    })

    const summary = response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ success: true, summary })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[deals/summary/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore nella generazione del riepilogo' }, { status: 500 })
  }
}
