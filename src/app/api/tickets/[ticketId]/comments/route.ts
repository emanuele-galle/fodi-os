import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createTicketCommentSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'support', 'read')

    const { ticketId } = await params

    const comments = await prisma.comment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json({ items: comments, total: comments.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'support', 'write')

    const { ticketId } = await params
    const body = await request.json()
    const parsed = createTicketCommentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { content } = parsed.data

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const comment = await prisma.comment.create({
      data: {
        ticketId,
        authorId: userId,
        content,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
