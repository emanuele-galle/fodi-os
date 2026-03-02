import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalClient, handlePortalError } from '@/lib/portal-auth'
import { dispatchNotification } from '@/lib/notifications'
import { sendDataChanged } from '@/lib/sse'
import { z } from 'zod'

const createCommentSchema = z.object({
  content: z.string().min(1, 'Contenuto obbligatorio'),
  attachments: z.array(z.object({
    fileName: z.string(),
    fileUrl: z.string(),
    fileSize: z.number(),
    mimeType: z.string(),
  })).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const client = await requirePortalClient(request)
    const { ticketId } = await params

    // Verify ticket belongs to client
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, clientId: client.id },
      select: { id: true },
    })
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket non trovato' }, { status: 404 })
    }

    const comments = await prisma.comment.findMany({
      where: { ticketId, isInternal: false },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    })

    return NextResponse.json({ items: comments, total: comments.length })
  } catch (e) {
    return handlePortalError(e, 'portal/tickets/:ticketId/comments')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const client = await requirePortalClient(request)
    const { ticketId } = await params

    const body = await request.json()
    const parsed = createCommentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { content, attachments } = parsed.data

    // Verify ticket belongs to client
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, clientId: client.id },
    })
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket non trovato' }, { status: 404 })
    }

    const comment = await prisma.comment.create({
      data: {
        ticketId,
        authorId: client.userId,
        content,
        isInternal: false,
        attachments: attachments || undefined,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    })

    // Notify ticket assignee + support team about client reply
    const recipients = new Set<string>()
    if (ticket.assigneeId) recipients.add(ticket.assigneeId)
    if (ticket.creatorId && ticket.creatorId !== client.userId) recipients.add(ticket.creatorId)
    // Also notify previous internal commenters
    const previousCommenters = await prisma.comment.findMany({
      where: { ticketId, authorId: { not: client.userId } },
      select: { authorId: true },
      distinct: ['authorId'],
    })
    for (const c of previousCommenters) recipients.add(c.authorId)

    if (recipients.size > 0) {
      await dispatchNotification({
        type: 'ticket_comment',
        title: 'Risposta dal cliente',
        message: `${client.companyName} ha risposto al ticket "${ticket.subject}"`,
        link: `/support/${ticketId}`,
        metadata: { ticketNumber: ticket.number, clientName: client.companyName },
        recipientIds: Array.from(recipients),
        excludeUserId: client.userId,
        groupKey: `ticket_comment:${ticketId}`,
        actorName: client.companyName,
      })
    }

    // SSE data changed for internal dashboard
    sendDataChanged(Array.from(recipients), 'ticket', ticketId)

    return NextResponse.json(comment, { status: 201 })
  } catch (e) {
    return handlePortalError(e, 'portal/tickets/:ticketId/comments')
  }
}
