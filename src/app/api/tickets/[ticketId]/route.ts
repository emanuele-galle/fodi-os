import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { updateTicketSchema } from '@/lib/validation'
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
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json(ticket)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
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

    return NextResponse.json(ticket)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
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
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
