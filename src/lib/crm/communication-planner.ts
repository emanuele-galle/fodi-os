import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/ai/anthropic'
import { brand } from '@/lib/branding'

// ============================================================
// TYPES
// ============================================================

interface CommunicationStep {
  sequence: number
  dayFromNow: number
  channel: 'EMAIL' | 'CALL' | 'MEETING' | 'WHATSAPP'
  scenario: string
  subject: string
  objective: string
  notes: string
}

interface CommunicationPlan {
  clientId: string
  clientName: string
  recommendations: CommunicationStep[]
  summary: string
}

// ============================================================
// CONTEXT BUILDERS
// ============================================================

interface PlanClientData {
  companyName: string
  status: string
  industry: string | null
  totalRevenue: { toString(): string }
  tags: string[]
  contacts: { firstName: string; lastName: string; role: string | null }[]
}

interface PlanHealthData {
  overallScore: number
  riskLevel: string
  interactionScore: number
}

function buildPlanContext(
  client: PlanClientData,
  healthScore: PlanHealthData | null,
  interactions: { type: string; subject: string; date: Date }[],
  deals: { title: string; stage: string; value: { toString(): string } }[],
  services: { service: { name: string; category: string } }[],
): string[] {
  const ctx: string[] = []
  ctx.push(`CLIENTE: ${client.companyName} (${client.status})`)
  ctx.push(`Settore: ${client.industry || 'N/D'} | Revenue: €${client.totalRevenue}`)
  if (client.tags.length > 0) ctx.push(`Tag: ${client.tags.join(', ')}`)
  if (healthScore) {
    ctx.push(`Health: ${healthScore.overallScore}/100 (${healthScore.riskLevel}) | Interazioni: ${healthScore.interactionScore}`)
  }
  if (client.contacts.length > 0) {
    ctx.push(`Contatti: ${client.contacts.map(c => `${c.firstName} ${c.lastName}${c.role ? ` (${c.role})` : ''}`).join(', ')}`)
  }
  if (interactions.length > 0) {
    ctx.push('\nULTIME INTERAZIONI:')
    for (const i of interactions) {
      ctx.push(`- [${new Date(i.date).toLocaleDateString('it-IT')}] ${i.type}: ${i.subject}`)
    }
  }
  if (deals.length > 0) {
    ctx.push('\nDEAL:')
    for (const d of deals) ctx.push(`- ${d.title} — ${d.stage} (€${d.value})`)
  }
  if (services.length > 0) {
    ctx.push('\nSERVIZI ATTIVI:')
    for (const s of services) ctx.push(`- ${s.service.name} (${s.service.category})`)
  }
  return ctx
}

// ============================================================
// GENERATE PLAN
// ============================================================

export async function generateCommunicationPlan(clientId: string): Promise<CommunicationPlan> {
  const [client, interactions, deals, healthScore, services] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: {
        companyName: true, status: true, industry: true,
        totalRevenue: true, tags: true,
        contacts: {
          select: { firstName: true, lastName: true, role: true, isPrimary: true },
          take: 3,
        },
      },
    }),
    prisma.interaction.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 10,
      select: { type: true, subject: true, date: true },
    }),
    prisma.deal.findMany({
      where: { clientId, stage: { notIn: ['CLOSED_LOST'] } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { title: true, stage: true, value: true, probability: true },
    }),
    prisma.clientHealthScore.findUnique({
      where: { clientId },
      select: { overallScore: true, riskLevel: true, interactionScore: true },
    }),
    prisma.clientService.findMany({
      where: { clientId },
      include: { service: { select: { name: true, category: true } } },
      take: 5,
    }),
  ])

  if (!client) throw new Error('Client not found')

  const ctx = buildPlanContext(client, healthScore, interactions, deals, services)

  const brandContext = brand.slug === 'fodi'
    ? 'FODI — agenzia di comunicazione e marketing.'
    : 'Piero Muscari — storytelling e media.'

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `Sei un consulente CRM strategico per ${brandContext}

Genera un piano di comunicazione personalizzato per questo cliente. Il piano deve contenere 3-5 step sequenziali nei prossimi 30 giorni.

Rispondi con un JSON con:
- "summary": breve riepilogo del piano (2-3 frasi)
- "recommendations": array di oggetti con:
  - "sequence": numero progressivo (1, 2, 3...)
  - "dayFromNow": giorni da oggi per eseguire (0=oggi, 3=tra 3 giorni...)
  - "channel": "EMAIL" | "CALL" | "MEETING" | "WHATSAPP"
  - "scenario": scenario email se channel e EMAIL (followup, reengagement, proposta_consulenza, ecc.)
  - "subject": oggetto/titolo della comunicazione
  - "objective": obiettivo specifico di questo step
  - "notes": suggerimenti per l'operatore

Rispondi SOLO con il JSON, senza markdown.

${ctx.join('\n')}`,
      },
    ],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const text = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

  try {
    const result = JSON.parse(text)
    return {
      clientId,
      clientName: client.companyName,
      recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
      summary: result.summary || '',
    }
  } catch {
    return { clientId, clientName: client.companyName, recommendations: [], summary: 'Errore nella generazione del piano' }
  }
}
