import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalClient, handlePortalError } from '@/lib/portal-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const client = await requirePortalClient(request)
    const { ticketId } = await params

    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, clientId: client.id },
      include: {
        project: { select: { id: true, name: true } },
        comments: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket non trovato' }, { status: 404 })
    }

    return NextResponse.json(ticket)
  } catch (e) {
    return handlePortalError(e, 'portal/tickets/:ticketId')
  }
}
