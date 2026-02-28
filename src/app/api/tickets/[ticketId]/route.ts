import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { updateTicketSchema } from '@/lib/validation'
import { notifyUsers } from '@/lib/notifications'
import { sendDataChanged } from '@/lib/sse'
import type { Role } from '@/generated/prisma/client'
import { TICKET_STATUS_LABELS } from '@/lib/constants'

export async function GET(request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'support', 'read')

    const { ticketId } = await params

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        client: { select: { id: true, companyName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket non trovato' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: ticket, ...ticket })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tickets]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const currentUserId = request.headers.get('x-user-id')!
    requirePermission(role, 'support', 'write')

    const { ticketId } = await params
    const body = await request.json()
    const parsed = updateTicketSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { status, priority, assigneeId, category } = parsed.data

    // Fetch previous ticket state for notification comparison
    const previousTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { status: true, assigneeId: true, creatorId: true, subject: true, number: true, client: { select: { companyName: true } } },
    })

    const data: Record<string, unknown> = {}
    if (status !== undefined) {
      data.status = status
      if (status === 'RESOLVED') {
        data.resolvedAt = new Date()
      }
    }
    if (priority !== undefined) data.priority = priority
    if (assigneeId !== undefined) data.assigneeId = assigneeId || null
    if (category !== undefined) data.category = category

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data,
      include: {
        client: { select: { id: true, companyName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    // Notifications for ticket changes
    if (previousTicket) {
      const ticketLink = `/support/${ticketId}`
      const recipients = new Set<string>()
      if (previousTicket.creatorId) recipients.add(previousTicket.creatorId)
      if (previousTicket.assigneeId) recipients.add(previousTicket.assigneeId)
      if (assigneeId) recipients.add(assigneeId)

      // Status change notification
      if (status !== undefined && status !== previousTicket.status) {
        await notifyUsers(
          Array.from(recipients),
          currentUserId,
          {
            type: 'ticket_status_changed',
            title: 'Stato ticket cambiato',
            message: `Ticket "${previousTicket.subject}" cambiato in "${TICKET_STATUS_LABELS[status] || status}"`,
            link: ticketLink,
            metadata: { clientName: previousTicket.client?.companyName, ticketNumber: previousTicket.number, ticketStatus: status },
          }
        )
      }

      // Assignee change notification
      if (assigneeId !== undefined && assigneeId !== previousTicket.assigneeId && assigneeId) {
        await notifyUsers(
          [assigneeId],
          currentUserId,
          {
            type: 'ticket_assigned',
            title: 'Ticket assegnato',
            message: `Ti è stato assegnato il ticket "${previousTicket.subject}"`,
            link: ticketLink,
            metadata: { clientName: previousTicket.client?.companyName, ticketNumber: previousTicket.number },
          }
        )
      }

      // Notify connected users about ticket change
      sendDataChanged(Array.from(recipients), 'ticket', ticketId)
    }

    return NextResponse.json({ success: true, data: ticket })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tickets]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    // Only ADMIN can delete tickets
    if (role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Solo gli ADMIN possono eliminare i ticket' }, { status: 403 })
    }

    const { ticketId } = await params

    await prisma.ticket.delete({ where: { id: ticketId } })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[tickets/DELETE]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
