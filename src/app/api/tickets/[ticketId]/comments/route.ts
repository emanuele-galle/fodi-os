import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { notifyUsers } from '@/lib/notifications'
import { z } from 'zod'
import type { Role } from '@/generated/prisma/client'

const createTicketCommentSchema = z.object({
  content: z.string().min(1, 'Contenuto obbligatorio'),
  isInternal: z.boolean().default(false),
  attachments: z.array(z.object({
    fileName: z.string(),
    fileUrl: z.string(),
    fileSize: z.number(),
    mimeType: z.string(),
  })).optional(),
})

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
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tickets/:ticketId/comments]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
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
    const { content, isInternal, attachments } = parsed.data

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket non trovato' }, { status: 404 })
    }

    const comment = await prisma.comment.create({
      data: {
        ticketId,
        authorId: userId,
        content,
        isInternal,
        attachments: attachments || undefined,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    // Notify ticket creator + assignee + previous commenters (except comment author)
    const recipients = new Set<string>()
    if (ticket.creatorId) recipients.add(ticket.creatorId)
    if (ticket.assigneeId) recipients.add(ticket.assigneeId)
    // Also notify users who previously commented on this ticket
    const previousCommenters = await prisma.comment.findMany({
      where: { ticketId },
      select: { authorId: true },
      distinct: ['authorId'],
    })
    for (const c of previousCommenters) recipients.add(c.authorId)

    const authorName = `${comment.author.firstName} ${comment.author.lastName}`
    await notifyUsers(
      Array.from(recipients),
      userId,
      {
        type: 'ticket_comment',
        title: 'Nuovo commento su ticket',
        message: `${authorName} ha commentato il ticket "${ticket.subject}"`,
        link: `/support/${ticketId}?commentId=${comment.id}`,
        metadata: { ticketNumber: ticket.number },
      }
    )

    // Notify portal user if comment is not internal
    if (!isInternal && ticket.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: ticket.clientId },
        select: { portalUserId: true, companyName: true },
      })
      if (client?.portalUserId && client.portalUserId !== userId) {
        await notifyUsers(
          [client.portalUserId],
          userId,
          {
            type: 'ticket_comment',
            title: 'Risposta al tuo ticket',
            message: `${authorName} ha risposto al ticket "${ticket.subject}"`,
            link: `/portal/tickets/${ticketId}`,
            metadata: { ticketNumber: ticket.number },
          }
        )
      }
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tickets/:ticketId/comments]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
