import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createNotification } from '@/lib/notifications'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ quoteId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'portal', 'read')

    const { quoteId } = await params

    // Find client linked to this portal user
    const client = await prisma.client.findUnique({
      where: { portalUserId: userId },
    })

    if (!client) {
      return NextResponse.json({ error: 'No client linked to this portal user' }, { status: 404 })
    }

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
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ quoteId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'portal', 'read')

    const { quoteId } = await params
    const body = await request.json()
    const { action } = body as { action?: string }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Azione non valida. Usa "approve" o "reject"' }, { status: 400 })
    }

    // Find client linked to this portal user
    const client = await prisma.client.findUnique({
      where: { portalUserId: userId },
    })
    if (!client) {
      return NextResponse.json({ error: 'Nessun cliente collegato a questo utente' }, { status: 404 })
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
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ error: e.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
