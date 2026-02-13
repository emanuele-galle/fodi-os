import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { updateTicketSchema } from '@/lib/validation'
import { notifyUsers } from '@/lib/notifications'
import type { Role } from '@/generated/prisma/client'

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
      return NextResponse.json({ error: 'Ticket non trovato' }, { status: 404 })
    }

    return NextResponse.json(ticket)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

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
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { status, priority, assigneeId, category } = parsed.data

    // Fetch previous ticket state for notification comparison
    const previousTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { status: true, assigneeId: true, creatorId: true, subject: true },
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
        const statusLabels: Record<string, string> = {
          OPEN: 'Aperto',
          IN_PROGRESS: 'In corso',
          WAITING_CLIENT: 'In attesa cliente',
          RESOLVED: 'Risolto',
          CLOSED: 'Chiuso',
        }
        await notifyUsers(
          Array.from(recipients),
          currentUserId,
          {
            type: 'ticket_status_changed',
            title: 'Stato ticket cambiato',
            message: `Ticket "${previousTicket.subject}" cambiato in "${statusLabels[status] || status}"`,
            link: ticketLink,
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
          }
        )
      }
    }

    return NextResponse.json(ticket)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    // Only ADMIN can delete tickets
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only ADMIN can delete tickets' }, { status: 403 })
    }

    const { ticketId } = await params

    await prisma.ticket.delete({ where: { id: ticketId } })

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
