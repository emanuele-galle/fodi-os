import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalClient, handlePortalError } from '@/lib/portal-auth'
import { createNotification } from '@/lib/notifications'

export async function GET(request: NextRequest, { params }: { params: Promise<{ quoteId: string }> }) {
  try {
    const client = await requirePortalClient(request)
    const { quoteId } = await params

    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, clientId: client.id },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' } },
        client: { select: { id: true, companyName: true } },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404 })
    }

    return NextResponse.json(quote)
  } catch (e) {
    return handlePortalError(e, 'portal/quotes/[quoteId]')
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ quoteId: string }> }) {
  try {
    const client = await requirePortalClient(request)
    const { quoteId } = await params
    const body = await request.json()
    const { action } = body as { action?: string }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Azione non valida. Usa "approve" o "reject"' }, { status: 400 })
    }

    // Verify quote belongs to this client and is in SENT status
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, clientId: client.id },
      include: { creator: { select: { id: true } } },
    })
    if (!quote) {
      return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404 })
    }
    if (quote.status !== 'SENT') {
      return NextResponse.json({ error: 'Questo preventivo non puo essere modificato' }, { status: 400 })
    }

    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'

    const updated = await prisma.quote.update({
      where: { id: quoteId },
      data: { status: newStatus },
    })

    // Notify the quote creator
    if (quote.creator?.id) {
      await createNotification({
        userId: quote.creator.id,
        type: action === 'approve' ? 'QUOTE_APPROVED' : 'QUOTE_REJECTED',
        title: action === 'approve'
          ? `Preventivo ${quote.number} approvato`
          : `Preventivo ${quote.number} rifiutato`,
        message: `Il cliente ${client.companyName} ha ${action === 'approve' ? 'approvato' : 'rifiutato'} il preventivo ${quote.number}.`,
        link: `/erp/quotes/${quoteId}`,
        metadata: { clientName: client.companyName, quoteNumber: quote.number, total: quote.total?.toString() },
      })
    }

    return NextResponse.json(updated)
  } catch (e) {
    return handlePortalError(e, 'portal/quotes/[quoteId]')
  }
}
