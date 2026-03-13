import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/ai/anthropic'
import { brand } from '@/lib/branding'
import type { Prisma } from '@/generated/prisma/client'

// ============================================================
// TYPES
// ============================================================

interface SuggestionResult {
  type: string
  title: string
  description: string
  priority: string
  actionType?: string
  actionData?: Record<string, unknown>
}

interface ClientContext {
  companyName: string
  status: string
  industry: string | null
  totalRevenue: Prisma.Decimal
  source: string | null
  tags: string[]
  contacts: { firstName: string; lastName: string; role: string | null; isPrimary: boolean }[]
}

interface InteractionContext {
  type: string
  subject: string
  date: Date
}

interface DealContext {
  title: string
  stage: string
  value: Prisma.Decimal
  probability: number
}

// ============================================================
// CONTEXT BUILDERS
// ============================================================

function buildClientLines(client: ClientContext, healthScore: { overallScore: number; riskLevel: string; interactionScore: number; pipelineScore: number } | null): string[] {
  const lines: string[] = []
  lines.push(`CLIENTE: ${client.companyName} (${client.status})`)
  lines.push(`Settore: ${client.industry || 'N/D'} | Revenue: €${client.totalRevenue} | Fonte: ${client.source || 'N/D'}`)
  if (client.tags.length > 0) lines.push(`Tag: ${client.tags.join(', ')}`)
  if (healthScore) {
    lines.push(`\nHEALTH: ${healthScore.overallScore}/100 (${healthScore.riskLevel})`)
    lines.push(`Interazioni: ${healthScore.interactionScore} | Pipeline: ${healthScore.pipelineScore}`)
  }
  if (client.contacts.length > 0) {
    lines.push('\nCONTATTI:')
    for (const c of client.contacts) {
      lines.push(`- ${c.firstName} ${c.lastName}${c.role ? ` (${c.role})` : ''}${c.isPrimary ? ' [primario]' : ''}`)
    }
  }
  return lines
}

function buildInteractionLines(interactions: InteractionContext[]): string[] {
  if (interactions.length === 0) return []
  const lines = ['\nINTERAZIONI RECENTI:']
  for (const i of interactions) {
    lines.push(`- [${new Date(i.date).toLocaleDateString('it-IT')}] ${i.type}: ${i.subject}`)
  }
  return lines
}

function buildDealLines(deals: DealContext[]): string[] {
  if (deals.length === 0) return []
  const lines = ['\nDEAL:']
  for (const d of deals) {
    lines.push(`- ${d.title} — ${d.stage} (€${d.value}, ${d.probability}%)`)
  }
  return lines
}

// ============================================================
// GENERATE SUGGESTIONS FOR A CLIENT
// ============================================================

async function generateClientSuggestions(clientId: string): Promise<number> {
  const brandSlug = brand.slug

  const [client, interactions, deals, healthScore] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: {
        companyName: true, status: true, industry: true,
        totalRevenue: true, source: true, tags: true, createdAt: true,
        contacts: {
          select: { firstName: true, lastName: true, email: true, role: true, isPrimary: true },
          take: 5,
        },
      },
    }),
    prisma.interaction.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 10,
      select: { type: true, subject: true, content: true, date: true },
    }),
    prisma.deal.findMany({
      where: { clientId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { title: true, stage: true, value: true, probability: true, updatedAt: true },
    }),
    prisma.clientHealthScore.findUnique({
      where: { clientId },
      select: { overallScore: true, riskLevel: true, interactionScore: true, pipelineScore: true },
    }),
  ])

  if (!client) return 0

  const ctx = [
    ...buildClientLines(client, healthScore),
    ...buildInteractionLines(interactions),
    ...buildDealLines(deals),
  ]

  const brandContext = brandSlug === 'fodi'
    ? 'FODI è un\'agenzia di comunicazione/marketing. Servizi: campagne, branding, eventi, digital marketing, social media.'
    : 'Piero Muscari opera nello storytelling e media. Servizi: interviste, pubblicazioni, eventi, collaborazioni media, personal branding.'

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [
      {
        role: 'user',
        content: `Sei un consulente CRM strategico per ${brandContext}

Analizza il profilo del cliente e genera suggerimenti proattivi in formato JSON.
Ogni suggerimento deve avere: type (FOLLOWUP|OPPORTUNITY|CHURN_RISK|TOUCHPOINT), title (breve), description (2-3 frasi), priority (LOW|MEDIUM|HIGH|URGENT), actionType (CALL|EMAIL|MEETING|TASK|DEAL), actionData (dati per creare l'azione).

Genera 1-3 suggerimenti SOLO se rilevanti. Se il cliente è sano e attivo, può bastare 1 suggerimento generico. Se è critico, genera suggerimenti urgenti.

Rispondi SOLO con un array JSON valido, senza markdown o testo aggiuntivo.

${ctx.join('\n')}`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
  return saveSuggestions(text, clientId, brandSlug)
}

function stripCodeFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
}

async function saveSuggestions(rawText: string, clientId: string, brandSlug: string): Promise<number> {
  let suggestions: SuggestionResult[]
  try {
    suggestions = JSON.parse(stripCodeFences(rawText))
    if (!Array.isArray(suggestions)) suggestions = []
  } catch {
    return 0
  }

  await prisma.aiSuggestion.updateMany({
    where: { clientId, status: 'PENDING', brandSlug },
    data: { status: 'EXPIRED' },
  })

  let created = 0
  for (const s of suggestions) {
    if (!s.type || !s.title || !s.description) continue
    await prisma.aiSuggestion.create({
      data: {
        clientId,
        type: s.type,
        title: s.title,
        description: s.description,
        priority: s.priority || 'MEDIUM',
        actionType: s.actionType || null,
        actionData: s.actionData ? (s.actionData as Prisma.InputJsonValue) : undefined,
        brandSlug,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })
    created++
  }

  return created
}

// ============================================================
// BATCH GENERATE (for cron)
// ============================================================

export async function batchGenerateSuggestions(): Promise<{ processed: number; suggestions: number; errors: number }> {
  const clients = await prisma.client.findMany({
    where: { status: { in: ['ACTIVE', 'PROSPECT'] } },
    select: { id: true },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })

  let processed = 0
  let suggestions = 0
  let errors = 0

  for (const client of clients) {
    try {
      const count = await generateClientSuggestions(client.id)
      suggestions += count
      processed++
    } catch {
      errors++
    }
  }

  return { processed, suggestions, errors }
}

// ============================================================
// CLIENT BRIEFING
// ============================================================

export async function generateClientBriefing(clientId: string): Promise<string> {
  const [client, interactions, deals, projects, healthScore] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: {
        companyName: true, status: true, industry: true,
        totalRevenue: true, source: true, notes: true, tags: true, createdAt: true,
        contacts: {
          select: { firstName: true, lastName: true, email: true, phone: true, role: true, isPrimary: true },
        },
      },
    }),
    prisma.interaction.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 20,
      select: { type: true, subject: true, content: true, date: true },
    }),
    prisma.deal.findMany({
      where: { clientId },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: { title: true, stage: true, value: true, probability: true, description: true },
    }),
    prisma.project.findMany({
      where: { clientId },
      select: { name: true, status: true, priority: true },
      take: 10,
    }),
    prisma.clientHealthScore.findUnique({
      where: { clientId },
      select: { overallScore: true, riskLevel: true, aiInsights: true },
    }),
  ])

  if (!client) throw new Error('Client not found')

  const ctx = buildBriefingContext(client, interactions, deals, projects, healthScore)

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `Genera un briefing pre-meeting conciso e operativo per questo cliente. Includi:
1. Riepilogo rapido della relazione (chi è il cliente, da quanto tempo, revenue)
2. Stato attuale (health, deal attivi, progetti)
3. Ultimi sviluppi significativi
4. Punti chiave da discutere nel meeting
5. Rischi da tenere d'occhio
6. Opportunità da esplorare

Usa un formato narrativo, diretto e professionale. 8-12 frasi. In italiano.

${ctx.join('\n')}`,
      },
    ],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

interface BriefingClient {
  companyName: string
  status: string
  industry: string | null
  totalRevenue: Prisma.Decimal
  notes: string | null
  createdAt: Date
  contacts: { firstName: string; lastName: string; email: string | null; phone: string | null; role: string | null; isPrimary: boolean }[]
}

interface BriefingDeal {
  title: string
  stage: string
  value: Prisma.Decimal
  probability: number
  description: string | null
}

function buildBriefingContext(
  client: BriefingClient,
  interactions: { type: string; subject: string; content: string | null; date: Date }[],
  deals: BriefingDeal[],
  projects: { name: string; status: string; priority: string }[],
  healthScore: { overallScore: number; riskLevel: string; aiInsights: string | null } | null,
): string[] {
  return [
    ...buildBriefingHeader(client, healthScore),
    ...buildContactsSection(client.contacts),
    ...buildBriefingInteractions(interactions),
    ...buildBriefingDeals(deals),
    ...buildProjectsSection(projects),
  ]
}

function buildBriefingHeader(client: BriefingClient, healthScore: { overallScore: number; riskLevel: string; aiInsights: string | null } | null): string[] {
  const lines = [
    `BRIEFING PRE-MEETING: ${client.companyName}`,
    `Stato: ${client.status} | Settore: ${client.industry || 'N/D'} | Revenue: €${client.totalRevenue}`,
    `Cliente dal: ${new Date(client.createdAt).toLocaleDateString('it-IT')}`,
  ]
  if (client.notes) lines.push(`Note: ${client.notes}`)
  if (healthScore) {
    lines.push(`\nHealth Score: ${healthScore.overallScore}/100 (${healthScore.riskLevel})`)
    if (healthScore.aiInsights) lines.push(`AI Insights: ${healthScore.aiInsights}`)
  }
  return lines
}

function buildContactsSection(contacts: BriefingClient['contacts']): string[] {
  if (contacts.length === 0) return []
  const lines = ['\nCONTATTI:']
  for (const c of contacts) {
    lines.push(`- ${c.firstName} ${c.lastName} — ${c.role || 'N/D'} | ${c.email || ''} | ${c.phone || ''}${c.isPrimary ? ' [primario]' : ''}`)
  }
  return lines
}

function buildBriefingInteractions(interactions: { type: string; subject: string; content: string | null; date: Date }[]): string[] {
  if (interactions.length === 0) return []
  const lines = ['\nSTORICO INTERAZIONI:']
  for (const i of interactions) {
    lines.push(`- [${new Date(i.date).toLocaleDateString('it-IT')}] ${i.type}: ${i.subject}${i.content ? ` — ${i.content.slice(0, 150)}` : ''}`)
  }
  return lines
}

function buildBriefingDeals(deals: BriefingDeal[]): string[] {
  if (deals.length === 0) return []
  const lines = ['\nDEAL:']
  for (const d of deals) {
    lines.push(`- ${d.title} — ${d.stage} (€${d.value}, ${d.probability}%)${d.description ? `: ${d.description.slice(0, 100)}` : ''}`)
  }
  return lines
}

function buildProjectsSection(projects: { name: string; status: string; priority: string }[]): string[] {
  if (projects.length === 0) return []
  const lines = ['\nPROGETTI:']
  for (const p of projects) {
    lines.push(`- ${p.name} — ${p.status} (${p.priority})`)
  }
  return lines
}
