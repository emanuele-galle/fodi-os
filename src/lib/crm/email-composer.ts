import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/ai/anthropic'
import { brand } from '@/lib/branding'
import { scrapeClientWebsite } from '@/lib/crm/website-scraper'

// ============================================================
// TYPES
// ============================================================

type EmailScenario =
  | 'followup'
  | 'reengagement'
  | 'thank_you'
  | 'project_update'
  | 'proposta_consulenza'
  | 'presentazione_servizi'
  | 'richiesta_feedback'
  | 'invito_evento'
  | 'proposta_collaborazione'
  | 'custom'

interface ComposeEmailParams {
  clientId: string
  contactId?: string
  scenario: EmailScenario
  customPrompt?: string
}

interface ComposedEmail {
  subject: string
  bodyHtml: string
  bodyText: string
  contactEmail: string
  contactName: string
  contactId: string | null
}

// ============================================================
// SCENARIO PROMPTS
// ============================================================

const SCENARIO_PROMPTS: Record<EmailScenario, string> = {
  followup: 'Genera un\'email di follow-up professionale dopo un incontro o una chiamata. Richiama brevemente i punti discussi e proponi i prossimi passi.',
  reengagement: 'Genera un\'email di re-engagement per riattivare un cliente inattivo. Mostra interesse genuino, menziona eventuali novita rilevanti e proponi un aggiornamento.',
  thank_you: 'Genera un\'email di ringraziamento per la collaborazione. Tono caloroso e apprezzativo, menziona risultati concreti se disponibili.',
  project_update: 'Genera un\'email di aggiornamento progetto. Professionale, conciso, orientato ai risultati. Includi stato attuale e prossimi step.',
  proposta_consulenza: 'Genera un\'email per proporre una consulenza gratuita o un incontro esplorativo. Evidenzia il valore che puoi portare basandoti sul profilo del cliente.',
  presentazione_servizi: 'Genera un\'email di presentazione dei servizi del brand. Personalizza in base al settore e alle esigenze del cliente.',
  richiesta_feedback: 'Genera un\'email per richiedere feedback su un lavoro svolto o un servizio erogato. Tono professionale e aperto.',
  invito_evento: 'Genera un\'email di invito a un evento, workshop o webinar. Crea interesse e urgenza.',
  proposta_collaborazione: 'Genera un\'email con una proposta di collaborazione strategica. Evidenzia sinergie e benefici reciproci.',
  custom: '',
}

// ============================================================
// CONTEXT BUILDERS
// ============================================================

function buildClientContext(
  client: {
    companyName: string
    industry: string | null
    status: string
    totalRevenue: { toString(): string }
    website: string | null
    tags: string[]
    contacts: { firstName: string; lastName: string; email: string | null; role: string | null; isPrimary: boolean }[]
  },
  healthScore: { overallScore: number; riskLevel: string } | null,
): string[] {
  const lines: string[] = []
  lines.push(`CLIENTE: ${client.companyName} (${client.status})`)
  lines.push(`Settore: ${client.industry || 'N/D'} | Revenue: €${client.totalRevenue} | Sito: ${client.website || 'N/D'}`)
  if (client.tags.length > 0) lines.push(`Tag: ${client.tags.join(', ')}`)
  if (healthScore) {
    lines.push(`Health Score: ${healthScore.overallScore}/100 (${healthScore.riskLevel})`)
  }
  if (client.contacts.length > 0) {
    lines.push('\nCONTATTI:')
    for (const c of client.contacts) {
      lines.push(`- ${c.firstName} ${c.lastName}${c.role ? ` (${c.role})` : ''}${c.isPrimary ? ' [primario]' : ''} — ${c.email || 'no email'}`)
    }
  }
  return lines
}

function buildInteractionContext(interactions: { type: string; subject: string; date: Date; content: string | null }[]): string[] {
  if (interactions.length === 0) return []
  const lines = ['\nULTIME INTERAZIONI:']
  for (const i of interactions) {
    lines.push(`- [${new Date(i.date).toLocaleDateString('it-IT')}] ${i.type}: ${i.subject}${i.content ? ` — ${i.content.slice(0, 100)}` : ''}`)
  }
  return lines
}

function buildDealContext(deals: { title: string; stage: string; value: { toString(): string }; probability: number }[]): string[] {
  if (deals.length === 0) return []
  const lines = ['\nDEAL ATTIVI:']
  for (const d of deals) {
    lines.push(`- ${d.title} — ${d.stage} (€${d.value}, ${d.probability}%)`)
  }
  return lines
}

function buildServiceContext(services: { service: { name: string; category: string } }[]): string[] {
  if (services.length === 0) return []
  const lines = ['\nSERVIZI ATTIVI:']
  for (const s of services) {
    lines.push(`- ${s.service.name} (${s.service.category})`)
  }
  return lines
}

function buildWebsiteContext(profile: { title: string; description: string; headings: string[] } | null): string[] {
  if (!profile || (!profile.title && !profile.description)) return []
  const lines = ['\nPROFILO SITO WEB:']
  if (profile.title) lines.push(`Titolo: ${profile.title}`)
  if (profile.description) lines.push(`Descrizione: ${profile.description}`)
  if (profile.headings.length > 0) lines.push(`Sezioni: ${profile.headings.slice(0, 5).join(', ')}`)
  return lines
}

// ============================================================
// COMPOSE EMAIL
// ============================================================

export async function composeEmail(params: ComposeEmailParams): Promise<ComposedEmail> {
  const { clientId, contactId, scenario, customPrompt } = params

  // Parallel data fetching
  const [client, interactions, deals, healthScore, services] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: {
        companyName: true,
        industry: true,
        status: true,
        totalRevenue: true,
        website: true,
        tags: true,
        contacts: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true, isPrimary: true },
          orderBy: { isPrimary: 'desc' as const },
          take: 5,
        },
      },
    }),
    prisma.interaction.findMany({
      where: { clientId },
      orderBy: { date: 'desc' },
      take: 10,
      select: { type: true, subject: true, date: true, content: true },
    }),
    prisma.deal.findMany({
      where: { clientId, stage: { notIn: ['CLOSED_LOST'] } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { title: true, stage: true, value: true, probability: true },
    }),
    prisma.clientHealthScore.findUnique({
      where: { clientId },
      select: { overallScore: true, riskLevel: true },
    }),
    prisma.clientService.findMany({
      where: { clientId },
      include: { service: { select: { name: true, category: true } } },
      take: 10,
    }),
  ])

  if (!client) throw new Error('Client not found')

  // Select target contact
  const targetContact = contactId
    ? client.contacts.find(c => c.id === contactId) || client.contacts[0]
    : client.contacts.find(c => c.isPrimary && c.email) || client.contacts.find(c => c.email) || client.contacts[0]

  if (!targetContact?.email) throw new Error('Nessun contatto con email trovato')

  const contactName = `${targetContact.firstName} ${targetContact.lastName}`.trim()

  // Optional website scraping (non-blocking)
  let websiteProfile = null
  if (client.website) {
    try {
      websiteProfile = await scrapeClientWebsite(client.website)
    } catch {
      // Non-critical, continue without
    }
  }

  // Build context
  const brandContext = brand.slug === 'fodi'
    ? 'FODI e un\'agenzia di comunicazione e marketing. Servizi: campagne, branding, eventi, digital marketing, social media.'
    : 'Piero Muscari opera nello storytelling e media. Servizi: interviste, pubblicazioni, eventi, collaborazioni media, personal branding.'

  const ctx = [
    ...buildClientContext(client, healthScore),
    ...buildInteractionContext(interactions),
    ...buildDealContext(deals),
    ...buildServiceContext(services),
    ...buildWebsiteContext(websiteProfile),
  ]

  const scenarioPrompt = scenario === 'custom'
    ? (customPrompt || 'Genera un\'email personalizzata per il cliente.')
    : SCENARIO_PROMPTS[scenario]

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `Sei un esperto di comunicazione aziendale per ${brand.name} (${brand.company}).
${brandContext}

ISTRUZIONE: ${scenarioPrompt}

DESTINATARIO: ${contactName}${targetContact.role ? ` (${targetContact.role})` : ''} — ${targetContact.email}

CONTESTO COMPLETO:
${ctx.join('\n')}

Genera un JSON con:
- "subject": oggetto email conciso e accattivante
- "bodyHtml": corpo email in HTML (usa <p>, <br>, <strong>, <ul>, <li>). Struttura: saluto personalizzato, 3-5 paragrafi con contenuto specifico basato sul contesto, call-to-action chiaro, chiusura con firma "${brand.name} — ${brand.company}"
- "bodyText": versione plain text dell'email

L'email DEVE essere:
- In italiano
- Professionale ma cordiale
- Personalizzata con dati reali del cliente (settore, interazioni recenti, deal, servizi)
- Con call-to-action specifico (non generico)

Rispondi SOLO con il JSON, senza markdown code fences.`,
      },
    ],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const text = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

  try {
    const result = JSON.parse(text)
    return {
      subject: result.subject || `Email per ${client.companyName}`,
      bodyHtml: result.bodyHtml || '<p>Contenuto non generato</p>',
      bodyText: result.bodyText || stripHtml(result.bodyHtml || ''),
      contactEmail: targetContact.email,
      contactName,
      contactId: targetContact.id,
    }
  } catch {
    return {
      subject: `Email per ${client.companyName}`,
      bodyHtml: `<p>${text}</p>`,
      bodyText: text,
      contactEmail: targetContact.email,
      contactName,
      contactId: targetContact.id,
    }
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
