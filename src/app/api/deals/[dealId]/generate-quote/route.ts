import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { anthropic } from '@/lib/ai/anthropic'
import { broadcastDataChanged } from '@/lib/sse'
import { logActivity } from '@/lib/activity-log'
import type { Role } from '@/generated/prisma/client'

type Params = { params: Promise<{ dealId: string }> }

interface AiLineItem {
  description: string
  quantity: number
  unitPrice: number
}

/**
 * POST /api/deals/[dealId]/generate-quote
 * Uses AI to generate a draft quote from deal data, then creates it.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')
    requirePermission(role, 'erp', 'write')

    const userId = request.headers.get('x-user-id')!
    const { dealId } = await params

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        client: { select: { id: true, companyName: true, industry: true } },
        lead: { select: { id: true, name: true, company: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    if (!deal) {
      return NextResponse.json({ success: false, error: 'Opportunità non trovata' }, { status: 404 })
    }

    if (!deal.clientId) {
      return NextResponse.json({
        success: false,
        error: 'L\'opportunità deve essere collegata a un cliente per generare un preventivo',
      }, { status: 400 })
    }

    // Get recent interactions for context
    const interactions = await prisma.interaction.findMany({
      where: { clientId: deal.clientId },
      orderBy: { date: 'desc' },
      take: 10,
      select: { type: true, subject: true, content: true },
    })

    // Get past quotes for this client to learn pricing patterns
    const pastQuotes = await prisma.quote.findMany({
      where: { clientId: deal.clientId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
    })

    // Build AI prompt
    const contextParts: string[] = []
    contextParts.push(`OPPORTUNITÀ: "${deal.title}"`)
    contextParts.push(`Valore target: €${deal.value}`)
    contextParts.push(`Cliente: ${deal.client!.companyName}`)
    if (deal.client!.industry) contextParts.push(`Settore: ${deal.client!.industry}`)
    if (deal.description) contextParts.push(`Descrizione: ${deal.description}`)

    if (interactions.length > 0) {
      contextParts.push('\nINTERAZIONI RECENTI:')
      for (const i of interactions) {
        contextParts.push(`- ${i.type}: ${i.subject}${i.content ? ` — ${i.content.slice(0, 150)}` : ''}`)
      }
    }

    if (pastQuotes.length > 0) {
      contextParts.push('\nPREVENTIVI PRECEDENTI (per riferimento prezzi):')
      for (const q of pastQuotes) {
        contextParts.push(`- "${q.title}" (€${q.total})`)
        for (const li of q.lineItems.slice(0, 5)) {
          contextParts.push(`  • ${li.description}: ${li.quantity}x €${li.unitPrice}`)
        }
      }
    }

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Sei un esperto commerciale italiano. Genera le voci di un preventivo per questa opportunità.

REGOLE:
- Il totale delle voci (prima di IVA) deve essere coerente con il valore target dell'opportunità
- Ogni voce deve avere: description (italiano, professionale), quantity (numero), unitPrice (€, senza IVA)
- Scomponi il lavoro in 3-8 voci logiche e dettagliate
- Se ci sono preventivi precedenti, usa prezzi simili come riferimento
- Le descrizioni devono essere specifiche, non generiche

Rispondi SOLO con un JSON valido nel formato:
{"title": "Preventivo per ...", "lineItems": [{"description": "...", "quantity": 1, "unitPrice": 1000}], "notes": "Nota opzionale per il cliente"}

${contextParts.join('\n')}`,
        },
      ],
    })

    const aiText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse AI response — extract JSON
    const jsonMatch = aiText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ success: false, error: 'Errore nella generazione AI — risposta non valida' }, { status: 500 })
    }

    let aiQuote: { title: string; lineItems: AiLineItem[]; notes?: string }
    try {
      aiQuote = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ success: false, error: 'Errore nel parsing della risposta AI' }, { status: 500 })
    }

    if (!aiQuote.lineItems || aiQuote.lineItems.length === 0) {
      return NextResponse.json({ success: false, error: 'L\'AI non ha generato voci valide' }, { status: 500 })
    }

    // Create the quote
    const itemsWithTotal = aiQuote.lineItems.map((item, i) => ({
      description: item.description,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice,
      total: (item.quantity || 1) * item.unitPrice,
      sortOrder: i,
    }))

    const subtotal = itemsWithTotal.reduce((sum, item) => sum + item.total, 0)
    const taxRate = 22
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount

    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + 30)

    const quote = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear()
      const lastQuote = await tx.quote.findFirst({
        where: { number: { startsWith: `Q-${year}` } },
        orderBy: { number: 'desc' },
      })
      const seq = lastQuote ? parseInt(lastQuote.number.split('-')[2]) + 1 : 1
      const number = `Q-${year}-${String(seq).padStart(3, '0')}`

      return tx.quote.create({
        data: {
          clientId: deal.clientId!,
          creatorId: userId,
          number,
          title: aiQuote.title || `Preventivo — ${deal.title}`,
          subtotal,
          taxRate,
          taxAmount,
          total,
          discount: 0,
          notes: aiQuote.notes || null,
          validUntil,
          lineItems: { create: itemsWithTotal },
        },
        include: {
          client: { select: { id: true, companyName: true } },
          lineItems: { orderBy: { sortOrder: 'asc' } },
        },
      })
    })

    logActivity({
      userId,
      action: 'AI_GENERATE',
      entityType: 'QUOTE',
      entityId: quote.id,
      metadata: { dealId, dealTitle: deal.title, quoteNumber: quote.number },
    })

    broadcastDataChanged('quote', quote.id)

    return NextResponse.json({ success: true, data: quote }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[deals/generate-quote]', e)
    return NextResponse.json({ success: false, error: 'Errore nella generazione del preventivo' }, { status: 500 })
  }
}
