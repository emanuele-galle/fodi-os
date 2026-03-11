import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { anthropic } from '@/lib/ai/anthropic'
import type { Role } from '@/generated/prisma/client'

type Params = { params: Promise<{ dealId: string }> }

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

    // Gather context data in parallel
    const [interactions, tasks, activities] = await Promise.all([
      // Interactions with the client (last 20)
      deal.clientId
        ? prisma.interaction.findMany({
            where: { clientId: deal.clientId },
            orderBy: { date: 'desc' },
            take: 20,
            select: { type: true, subject: true, content: true, date: true },
          })
        : Promise.resolve([]),

      // Tasks related to this deal (tagged with deal ID)
      prisma.task.findMany({
        where: {
          OR: [
            { tags: { has: `deal:${dealId}` } },
            ...(deal.clientId ? [{ clientId: deal.clientId }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: { title: true, status: true, priority: true, dueDate: true, createdAt: true },
      }),

      // Activity log entries for this deal (last 20)
      prisma.activityLog.findMany({
        where: { entityType: 'DEAL', entityId: dealId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { action: true, metadata: true, createdAt: true },
      }),
    ])

    // Build context for AI
    const contextParts: string[] = []

    contextParts.push(`OPPORTUNITÀ: "${deal.title}"`)
    contextParts.push(`Valore: €${deal.value} | Fase: ${deal.stage} | Probabilità: ${deal.probability}%`)
    contextParts.push(`Owner: ${deal.owner.firstName} ${deal.owner.lastName}`)
    if (deal.client) contextParts.push(`Cliente: ${deal.client.companyName}`)
    if (deal.lead) contextParts.push(`Lead: ${deal.lead.name}${deal.lead.company ? ` (${deal.lead.company})` : ''}`)
    if (deal.contact) contextParts.push(`Contatto: ${deal.contact.firstName} ${deal.contact.lastName}`)
    if (deal.expectedCloseDate) contextParts.push(`Chiusura prevista: ${new Date(deal.expectedCloseDate).toLocaleDateString('it-IT')}`)
    if (deal.description) contextParts.push(`Descrizione: ${deal.description}`)

    if (interactions.length > 0) {
      contextParts.push('\nINTERAZIONI RECENTI:')
      for (const i of interactions) {
        const date = new Date(i.date).toLocaleDateString('it-IT')
        contextParts.push(`- [${date}] ${i.type}: ${i.subject}${i.content ? ` — ${i.content.slice(0, 200)}` : ''}`)
      }
    }

    if (tasks.length > 0) {
      contextParts.push('\nTASK CORRELATI:')
      for (const t of tasks) {
        const due = t.dueDate ? ` (scad. ${new Date(t.dueDate).toLocaleDateString('it-IT')})` : ''
        contextParts.push(`- [${t.status}] ${t.title} — ${t.priority}${due}`)
      }
    }

    if (activities.length > 0) {
      contextParts.push('\nATTIVITÀ RECENTI:')
      for (const a of activities) {
        const date = new Date(a.createdAt).toLocaleDateString('it-IT')
        contextParts.push(`- [${date}] ${a.action}`)
      }
    }

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

${contextParts.join('\n')}`,
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
