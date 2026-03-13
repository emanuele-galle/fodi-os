import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/ai/anthropic'
import { brand } from '@/lib/branding'
import { scrapeClientWebsite } from '@/lib/crm/website-scraper'
import type { Role } from '@/generated/prisma/client'

type Params = { params: Promise<{ clientId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { clientId } = await params

    const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1'
    if (!forceRefresh) {
      const cached = await getCachedInsights(clientId)
      if (cached) return NextResponse.json({ success: true, insights: cached })
    }

    const insights = await generateAndCacheInsights(clientId)
    return NextResponse.json({ success: true, insights })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    if (e instanceof Error && e.message === 'NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Cliente non trovato' }, { status: 404 })
    }
    console.error('[clients/insights/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore nella generazione insights' }, { status: 500 })
  }
}

async function getCachedInsights(clientId: string): Promise<string | null> {
  const healthScore = await prisma.clientHealthScore.findUnique({
    where: { clientId },
    select: { aiInsights: true, aiInsightsAt: true },
  })
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  if (healthScore?.aiInsights && healthScore.aiInsightsAt && healthScore.aiInsightsAt > twentyFourHoursAgo) {
    return healthScore.aiInsights
  }
  return null
}

async function generateAndCacheInsights(clientId: string): Promise<string> {
  const [client, interactions, deals, projects, healthScore, clientServices] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: {
        companyName: true, status: true, industry: true,
        totalRevenue: true, source: true, tags: true, notes: true,
        website: true, vatNumber: true, pec: true,
        createdAt: true,
        contacts: {
          select: { firstName: true, lastName: true, email: true, phone: true, role: true, isPrimary: true },
          take: 10,
        },
        _count: { select: { contacts: true, quotes: true, tickets: true } },
      },
    }),
    prisma.interaction.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 15,
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
      select: { name: true, status: true, priority: true, description: true },
      take: 10,
    }),
    prisma.clientHealthScore.findUnique({
      where: { clientId },
      select: { overallScore: true, riskLevel: true, interactionScore: true, pipelineScore: true, projectScore: true, revenueScore: true, engagementScore: true },
    }),
    prisma.clientService.findMany({
      where: { clientId, status: 'ACTIVE' },
      select: { service: { select: { name: true, category: true } }, value: true, startDate: true },
    }),
  ])

  if (!client) throw new Error('NOT_FOUND')

  // Scrape website in parallel (non-blocking, with timeout)
  const websiteProfile = client.website ? await scrapeClientWebsite(client.website) : null

  const ctx = [
    ...buildClientProfile(client, healthScore, clientServices),
    ...buildWebsiteSection(client.website, websiteProfile),
    ...buildContactsSection(client.contacts),
    ...buildInteractionsSection(interactions),
    ...buildDealsSection(deals),
    ...buildProjectsSection(projects),
  ]

  const brandContext = brand.slug === 'fodi'
    ? 'FODI è un\'agenzia di comunicazione, marketing digitale e organizzazione eventi.'
    : 'Piero Muscari opera nel settore storytelling, media, personal branding e organizzazione eventi.'

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `Sei un analista CRM strategico per ${brandContext}

Genera un'analisi COMPLETA e DETTAGLIATA di questo cliente. L'analisi deve coprire:

## 1. PROFILO CLIENTE
Chi è questo soggetto? Cosa fa? In quale settore opera? Se hai informazioni dal sito web, descrivi la loro attività, posizionamento e offerta. Dimensioni percepite dell'azienda.

## 2. STATO DELLA RELAZIONE
Da quanto tempo è cliente? Revenue generata, servizi attivi, frequenza delle interazioni. Tendenza della relazione (crescita, stabile, declino).

## 3. HEALTH & RISCHI
Analisi dello health score e dei sotto-punteggi. Cosa funziona e cosa no. Rischi concreti di churn e perché.

## 4. OPPORTUNITÀ
Quali servizi aggiuntivi potrebbero interessare basandoti sul profilo del cliente e sulla sua attività? Cross-sell e upsell realistici.

## 5. AZIONI RACCOMANDATE
3-5 azioni concrete con priorità, tempistica e responsabile suggerito. Sii specifico (es. "Chiamare Mario Rossi per proporre..." non "Contattare il cliente").

Usa markdown con heading ##. Scrivi in italiano, tono professionale e diretto. Sii dettagliato ma concreto — NO frasi generiche. 15-25 frasi totali.

${ctx.join('\n')}`,
      },
    ],
  })

  const insights = response.content[0].type === 'text' ? response.content[0].text : ''

  await prisma.clientHealthScore.upsert({
    where: { clientId },
    create: { clientId, aiInsights: insights, aiInsightsAt: new Date() },
    update: { aiInsights: insights, aiInsightsAt: new Date() },
  })

  return insights
}

// --- Context builders ---

interface ClientData {
  companyName: string
  status: string
  industry: string | null
  totalRevenue: unknown
  source: string | null
  tags: string[]
  notes: string | null
  website: string | null
  vatNumber: string | null
  pec: string | null
  createdAt: Date
  _count: { contacts: number; quotes: number; tickets: number }
}

interface HealthData {
  overallScore: number
  riskLevel: string
  interactionScore: number
  pipelineScore: number
  projectScore: number
  revenueScore: number
  engagementScore: number
}

function buildClientProfile(
  client: ClientData,
  healthScore: HealthData | null,
  services: { service: { name: string; category: string }; value: unknown; startDate: Date | null }[],
): string[] {
  const lines: string[] = []
  lines.push(`CLIENTE: ${client.companyName}`)
  lines.push(`Stato CRM: ${client.status} | Settore: ${client.industry || 'N/D'} | Revenue totale: €${client.totalRevenue}`)
  lines.push(`Fonte acquisizione: ${client.source || 'N/D'} | Cliente dal: ${new Date(client.createdAt).toLocaleDateString('it-IT')}`)
  lines.push(`Contatti: ${client._count.contacts} | Preventivi: ${client._count.quotes} | Ticket: ${client._count.tickets}`)
  if (client.vatNumber) lines.push(`P.IVA: ${client.vatNumber}`)
  if (client.pec) lines.push(`PEC: ${client.pec}`)
  if (client.tags.length > 0) lines.push(`Tag: ${client.tags.join(', ')}`)
  if (client.notes) lines.push(`\nNOTE INTERNE:\n${client.notes}`)

  if (healthScore) {
    lines.push(`\nHEALTH SCORE: ${healthScore.overallScore}/100 (${healthScore.riskLevel})`)
    lines.push(`Sub-scores — Interazioni: ${healthScore.interactionScore} | Pipeline: ${healthScore.pipelineScore} | Progetti: ${healthScore.projectScore} | Revenue: ${healthScore.revenueScore} | Engagement: ${healthScore.engagementScore}`)
  }

  if (services.length > 0) {
    lines.push('\nSERVIZI ATTIVI:')
    for (const s of services) {
      const val = s.value ? ` — €${s.value}` : ''
      const start = s.startDate ? ` (dal ${new Date(s.startDate).toLocaleDateString('it-IT')})` : ''
      lines.push(`- ${s.service.name} (${s.service.category})${val}${start}`)
    }
  }

  return lines
}

function buildWebsiteSection(
  url: string | null,
  profile: Awaited<ReturnType<typeof scrapeClientWebsite>>,
): string[] {
  if (!url) return ['\nSITO WEB: Non disponibile']
  const lines = [`\nSITO WEB: ${url}`]
  if (!profile || profile.error) {
    lines.push(`(Non raggiungibile: ${profile?.error || 'errore sconosciuto'})`)
    return lines
  }
  if (profile.title) lines.push(`Titolo: ${profile.title}`)
  if (profile.description) lines.push(`Meta description: ${profile.description}`)
  if (profile.headings.length > 0) {
    lines.push(`Sezioni principali: ${profile.headings.slice(0, 8).join(' | ')}`)
  }
  if (profile.socialLinks.length > 0) {
    lines.push(`Social: ${profile.socialLinks.join(', ')}`)
  }
  if (profile.bodySnippet) {
    lines.push(`\nCONTENUTO SITO (estratto):\n${profile.bodySnippet.slice(0, 2000)}`)
  }
  return lines
}

function buildContactsSection(contacts: { firstName: string; lastName: string; email: string | null; phone: string | null; role: string | null; isPrimary: boolean }[]): string[] {
  if (contacts.length === 0) return ['\nCONTATTI: Nessuno registrato']
  const lines = ['\nCONTATTI:']
  for (const c of contacts) {
    const parts = [`${c.firstName} ${c.lastName}`]
    if (c.role) parts.push(`(${c.role})`)
    if (c.email) parts.push(`— ${c.email}`)
    if (c.phone) parts.push(`| ${c.phone}`)
    if (c.isPrimary) parts.push('[PRIMARIO]')
    lines.push(`- ${parts.join(' ')}`)
  }
  return lines
}

function buildInteractionsSection(interactions: { type: string; subject: string; content: string | null; date: Date }[]): string[] {
  if (interactions.length === 0) return ['\nINTERAZIONI: Nessuna registrata']
  const lines = ['\nINTERAZIONI RECENTI:']
  for (const i of interactions) {
    const snippet = i.content ? ` — ${i.content.slice(0, 150)}` : ''
    lines.push(`- [${new Date(i.date).toLocaleDateString('it-IT')}] ${i.type}: ${i.subject}${snippet}`)
  }
  return lines
}

function buildDealsSection(deals: { title: string; stage: string; value: unknown; probability: number; description: string | null }[]): string[] {
  if (deals.length === 0) return ['\nDEAL: Nessuno']
  const lines = ['\nDEAL:']
  for (const d of deals) {
    const desc = d.description ? ` — ${d.description.slice(0, 100)}` : ''
    lines.push(`- ${d.title} — ${d.stage} (€${d.value}, prob. ${d.probability}%)${desc}`)
  }
  return lines
}

function buildProjectsSection(projects: { name: string; status: string; priority: string; description: string | null }[]): string[] {
  if (projects.length === 0) return ['\nPROGETTI: Nessuno']
  const lines = ['\nPROGETTI:']
  for (const p of projects) {
    const desc = p.description ? ` — ${p.description.slice(0, 100)}` : ''
    lines.push(`- ${p.name} — ${p.status} (${p.priority})${desc}`)
  }
  return lines
}
