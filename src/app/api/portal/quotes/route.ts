import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'portal', 'read')

    const client = await prisma.client.findUnique({
      where: { portalUserId: userId },
    })

    if (!client) {
      return NextResponse.json({ error: 'Nessun cliente collegato a questo utente' }, { status: 404 })
    }

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
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ error: e.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
