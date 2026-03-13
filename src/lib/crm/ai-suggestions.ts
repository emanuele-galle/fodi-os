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

// ============================================================
// GENERATE SUGGESTIONS FOR A CLIENT
// ============================================================

async function generateClientSuggestions(clientId: string): Promise<number> {
  const brandSlug = brand.slug

  // Gather client context
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

  // Build context
  const ctx: string[] = []
  ctx.push(`CLIENTE: ${client.companyName} (${client.status})`)
  ctx.push(`Settore: ${client.industry || 'N/D'} | Revenue: €${client.totalRevenue} | Fonte: ${client.source || 'N/D'}`)
  if (client.tags.length > 0) ctx.push(`Tag: ${client.tags.join(', ')}`)

  if (healthScore) {
    ctx.push(`\nHEALTH: ${healthScore.overallScore}/100 (${healthScore.riskLevel})`)
    ctx.push(`Interazioni: ${healthScore.interactionScore} | Pipeline: ${healthScore.pipelineScore}`)
  }

  if (client.contacts.length > 0) {
    ctx.push('\nCONTATTI:')
    for (const c of client.contacts) {
      ctx.push(`- ${c.firstName} ${c.lastName}${c.role ? ` (${c.role})` : ''}${c.isPrimary ? ' [primario]' : ''}`)
    }
  }

  if (interactions.length > 0) {
    ctx.push('\nINTERAZIONI RECENTI:')
    for (const i of interactions) {
      ctx.push(`- [${new Date(i.date).toLocaleDateString('it-IT')}] ${i.type}: ${i.subject}`)
    }
  }

  if (deals.length > 0) {
    ctx.push('\nDEAL:')
    for (const d of deals) {
      ctx.push(`- ${d.title} — ${d.stage} (€${d.value}, ${d.probability}%)`)
    }
  }

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
  let suggestions: SuggestionResult[]
  try {
    suggestions = JSON.parse(text)
    if (!Array.isArray(suggestions)) suggestions = []
  } catch {
    return 0
  }

  // Expire old pending suggestions for this client
  await prisma.aiSuggestion.updateMany({
    where: { clientId, status: 'PENDING', brandSlug },
    data: { status: 'EXPIRED' },
  })

  // Create new suggestions
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
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
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
  // Focus on active/prospect clients + at-risk
  const clients = await prisma.client.findMany({
    where: { status: { in: ['ACTIVE', 'PROSPECT'] } },
    select: { id: true },
    orderBy: { updatedAt: 'desc' },
    take: 50, // Limit to avoid API cost explosion
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

  const ctx: string[] = []
  ctx.push(`BRIEFING PRE-MEETING: ${client.companyName}`)
  ctx.push(`Stato: ${client.status} | Settore: ${client.industry || 'N/D'} | Revenue: €${client.totalRevenue}`)
  ctx.push(`Cliente dal: ${new Date(client.createdAt).toLocaleDateString('it-IT')}`)
  if (client.notes) ctx.push(`Note: ${client.notes}`)

  if (healthScore) {
    ctx.push(`\nHealth Score: ${healthScore.overallScore}/100 (${healthScore.riskLevel})`)
    if (healthScore.aiInsights) ctx.push(`AI Insights: ${healthScore.aiInsights}`)
  }

  if (client.contacts.length > 0) {
    ctx.push('\nCONTATTI:')
    for (const c of client.contacts) {
      ctx.push(`- ${c.firstName} ${c.lastName} — ${c.role || 'N/D'} | ${c.email || ''} | ${c.phone || ''}${c.isPrimary ? ' [primario]' : ''}`)
    }
  }

  if (interactions.length > 0) {
    ctx.push('\nSTORICO INTERAZIONI:')
    for (const i of interactions) {
      ctx.push(`- [${new Date(i.date).toLocaleDateString('it-IT')}] ${i.type}: ${i.subject}${i.content ? ` — ${i.content.slice(0, 150)}` : ''}`)
    }
  }

  if (deals.length > 0) {
    ctx.push('\nDEAL:')
    for (const d of deals) {
      ctx.push(`- ${d.title} — ${d.stage} (€${d.value}, ${d.probability}%)${d.description ? `: ${d.description.slice(0, 100)}` : ''}`)
    }
  }

  if (projects.length > 0) {
    ctx.push('\nPROGETTI:')
    for (const p of projects) {
      ctx.push(`- ${p.name} — ${p.status} (${p.priority})`)
    }
  }

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
