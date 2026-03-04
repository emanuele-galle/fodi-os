import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalClient, handlePortalError } from '@/lib/portal-auth'

export async function GET(request: NextRequest) {
  try {
    const client = await requirePortalClient(request)

    // Show only quotes that have been sent or beyond (not drafts)
    const quotes = await prisma.quote.findMany({
      where: {
        clientId: client.id,
        status: { in: ['SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'INVOICED'] },
      },
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        total: true,
        createdAt: true,
        validUntil: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ items: quotes, total: quotes.length })
  } catch (e) {
    return handlePortalError(e, 'portal/quotes')
  }
}
