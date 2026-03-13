import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/ai/anthropic'
import { brand } from '@/lib/branding'

// ============================================================
// TYPES
// ============================================================

interface CrossSellResult {
  serviceId: string
  serviceName: string
  reason: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  suggestedApproach: string
}

// ============================================================
// CROSS-SELL SUGGESTIONS
// ============================================================

export async function generateCrossSellSuggestions(clientId: string): Promise<CrossSellResult[]> {
  const brandSlug = brand.slug

  const [client, catalog] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: {
        companyName: true,
        industry: true,
        status: true,
        tags: true,
        totalRevenue: true,
        clientServices: {
          select: {
            service: { select: { id: true, name: true, category: true } },
            status: true,
          },
        },
        deals: {
          orderBy: { updatedAt: 'desc' },
          take: 5,
          select: { title: true, stage: true, value: true },
        },
        interactions: {
          orderBy: { date: 'desc' },
          take: 5,
          select: { type: true, subject: true, date: true },
        },
      },
    }),
    prisma.serviceCatalog.findMany({
      where: { brandSlug, isActive: true },
      select: { id: true, name: true, category: true, description: true, tags: true, priceType: true, priceMin: true, priceMax: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ])

  if (!client || catalog.length === 0) return []

  const activeServiceIds = new Set(
    client.clientServices.filter(cs => cs.status === 'ACTIVE').map(cs => cs.service.id)
  )
  const availableServices = catalog.filter(s => !activeServiceIds.has(s.id))
  if (availableServices.length === 0) return []

  const ctx = buildCrossSellContext(client, availableServices)

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `Sei un consulente commerciale per ${brandSlug === 'fodi' ? 'FODI (agenzia comunicazione/marketing)' : 'Piero Muscari (storytelling/media)'}.

Analizza il profilo del cliente e i servizi disponibili. Suggerisci 1-3 servizi che potrebbero interessare al cliente, in ordine di rilevanza.

Rispondi SOLO con un array JSON valido (no markdown). Ogni elemento:
{ "serviceId": "...", "serviceName": "...", "reason": "2-3 frasi sul perché", "confidence": "HIGH|MEDIUM|LOW", "suggestedApproach": "come proporre il servizio" }

${ctx}`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
  return parseSuggestions(text, availableServices)
}

function buildCrossSellContext(
  client: {
    companyName: string
    industry: string | null
    tags: string[]
    totalRevenue: unknown
    clientServices: { service: { name: string; category: string }; status: string }[]
    deals: { title: string; stage: string; value: unknown }[]
    interactions: { type: string; subject: string; date: Date }[]
  },
  availableServices: { id: string; name: string; category: string; description: string | null; tags: string[]; priceType: string; priceMin: unknown; priceMax: unknown }[],
): string {
  const lines: string[] = []
  lines.push(`CLIENTE: ${client.companyName}`)
  lines.push(`Settore: ${client.industry || 'N/D'} | Revenue: €${client.totalRevenue}`)
  if (client.tags.length > 0) lines.push(`Tag: ${client.tags.join(', ')}`)

  const activeServices = client.clientServices.filter(cs => cs.status === 'ACTIVE')
  if (activeServices.length > 0) {
    lines.push('\nSERVIZI ATTIVI:')
    for (const cs of activeServices) lines.push(`- ${cs.service.name} (${cs.service.category})`)
  }

  if (client.deals.length > 0) {
    lines.push('\nDEAL RECENTI:')
    for (const d of client.deals) lines.push(`- ${d.title} — ${d.stage} (€${d.value})`)
  }

  lines.push('\nSERVIZI DISPONIBILI:')
  for (const s of availableServices) {
    const price = s.priceMin ? `€${s.priceMin}${s.priceMax ? `-€${s.priceMax}` : ''}` : 'su preventivo'
    lines.push(`- [${s.id}] ${s.name} (${s.category}) — ${s.description?.slice(0, 80) || 'N/D'} | ${price}`)
  }

  return lines.join('\n')
}

function parseSuggestions(
  text: string,
  availableServices: { id: string; name: string }[],
): CrossSellResult[] {
  try {
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) return []
    const validIds = new Set(availableServices.map(s => s.id))
    return parsed
      .filter((s: CrossSellResult) => s.serviceId && validIds.has(s.serviceId) && s.reason)
      .slice(0, 3)
  } catch {
    return []
  }
}
