import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/ai/anthropic'
import type { Role } from '@/generated/prisma/client'

type Params = { params: Promise<{ clientId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { clientId } = await params

    // Check cache (24h)
    const healthScore = await prisma.clientHealthScore.findUnique({
      where: { clientId },
      select: { aiInsights: true, aiInsightsAt: true, overallScore: true, riskLevel: true },
    })

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    if (healthScore?.aiInsights && healthScore.aiInsightsAt && healthScore.aiInsightsAt > twentyFourHoursAgo) {
      return NextResponse.json({ success: true, insights: healthScore.aiInsights })
    }

    // Gather context
    const [client, interactions, deals, projects] = await Promise.all([
      prisma.client.findUnique({
        where: { id: clientId },
        select: {
          companyName: true, status: true, industry: true,
          totalRevenue: true, source: true, tags: true, createdAt: true,
          _count: { select: { contacts: true, quotes: true, tickets: true } },
        },
      }),
      prisma.interaction.findMany({
        where: { clientId },
        orderBy: { date: 'desc' },
        take: 15,
        select: { type: true, subject: true, date: true },
      }),
      prisma.deal.findMany({
        where: { clientId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { title: true, stage: true, value: true, probability: true },
      }),
      prisma.project.findMany({
        where: { clientId },
        select: { name: true, status: true },
        take: 10,
      }),
    ])

    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente non trovato' }, { status: 404 })
    }

    const contextParts: string[] = []
    contextParts.push(`CLIENTE: ${client.companyName}`)
    contextParts.push(`Stato: ${client.status} | Settore: ${client.industry || 'N/D'} | Revenue: €${client.totalRevenue}`)
    contextParts.push(`Contatti: ${client._count.contacts} | Preventivi: ${client._count.quotes} | Ticket: ${client._count.tickets}`)
    if (client.tags.length > 0) contextParts.push(`Tag: ${client.tags.join(', ')}`)
    if (healthScore) {
      contextParts.push(`\nHEALTH SCORE: ${healthScore.overallScore}/100 (${healthScore.riskLevel})`)
    }

    if (interactions.length > 0) {
      contextParts.push('\nINTERAZIONI RECENTI:')
      for (const i of interactions) {
        contextParts.push(`- [${new Date(i.date).toLocaleDateString('it-IT')}] ${i.type}: ${i.subject}`)
      }
    }

    if (deals.length > 0) {
      contextParts.push('\nDEAL:')
      for (const d of deals) {
        contextParts.push(`- ${d.title} — ${d.stage} (€${d.value}, ${d.probability}%)`)
      }
    }

    if (projects.length > 0) {
      contextParts.push('\nPROGETTI:')
      for (const p of projects) {
        contextParts.push(`- ${p.name} — ${p.status}`)
      }
    }

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `Sei un consulente CRM esperto. Analizza questo cliente e fornisci insights strategici in italiano:
1. Stato della relazione e trend
2. Rischi identificati e come mitigarli
3. Opportunità di crescita
4. Azioni concrete suggerite (max 3)

Rispondi in 5-7 frasi, diretto e strategico. Non usare heading o elenchi puntati, solo testo fluido.

${contextParts.join('\n')}`,
        },
      ],
    })

    const insights = response.content[0].type === 'text' ? response.content[0].text : ''

    // Cache in DB
    await prisma.clientHealthScore.upsert({
      where: { clientId },
      create: { clientId, aiInsights: insights, aiInsightsAt: new Date() },
      update: { aiInsights: insights, aiInsightsAt: new Date() },
    })

    return NextResponse.json({ success: true, insights })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[clients/insights/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore nella generazione insights' }, { status: 500 })
  }
}
