import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalClient, handlePortalError } from '@/lib/portal-auth'
import { notifyUsers } from '@/lib/notifications'
import { sendDataChanged } from '@/lib/sse'
import { z } from 'zod'

const createPortalTicketSchema = z.object({
  subject: z.string().min(3, 'Oggetto troppo corto').max(300),
  description: z.string().min(5, 'Descrizione troppo corta'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  category: z.string().max(50).default('general'),
  projectId: z.string().uuid().optional(),
  attachments: z.array(z.object({
    fileName: z.string(),
    fileUrl: z.string(),
    fileSize: z.number(),
    mimeType: z.string(),
  })).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const client = await requirePortalClient(request)

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where = {
      clientId: client.id,
      ...(status && { status: { in: status.split(',').map((s) => s.trim()) } as never }),
    }

    const [items, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { comments: { where: { isInternal: false } } } },
        },
      }),
      prisma.ticket.count({ where }),
    ])

    return NextResponse.json({ items, total, page, limit })
  } catch (e) {
    return handlePortalError(e, 'portal/tickets')
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await requirePortalClient(request)

    const body = await request.json()
    const parsed = createPortalTicketSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { subject, description, priority, category, projectId, attachments } = parsed.data

    // Verify project belongs to this client
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, clientId: client.id },
      })
      if (!project) {
        return NextResponse.json({ error: 'Progetto non trovato' }, { status: 404 })
      }
    }

    // Generate ticket number: T-YYYY-NNN
    const year = new Date().getFullYear()
    const count = await prisma.ticket.count({
      where: { number: { startsWith: `T-${year}-` } },
    })
    const number = `T-${year}-${String(count + 1).padStart(3, '0')}`

    const ticket = await prisma.ticket.create({
      data: {
        clientId: client.id,
        projectId: projectId || null,
        creatorId: client.userId,
        number,
        subject,
        description,
        priority,
        category,
      },
    })

    // Create initial comment with attachments if provided
    if (attachments && attachments.length > 0) {
      await prisma.comment.create({
        data: {
          ticketId: ticket.id,
          authorId: client.userId,
          content: description,
          isInternal: false,
          attachments: attachments,
        },
      })
    }

    // Notify support team
    const supportUsers = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPPORT', 'DIR_SUPPORT'] },
        isActive: true,
      },
      select: { id: true },
    })
    await notifyUsers(
      supportUsers.map((u) => u.id),
      client.userId,
      {
        type: 'ticket_created',
        title: 'Nuovo ticket dal portale',
        message: `${client.companyName} ha aperto il ticket "${subject}" (${number})`,
        link: `/support/${ticket.id}`,
        metadata: { clientName: client.companyName, ticketNumber: number },
      }
    )

    sendDataChanged(supportUsers.map((u) => u.id), 'ticket', ticket.id)

    return NextResponse.json({ data: ticket }, { status: 201 })
  } catch (e) {
    return handlePortalError(e, 'portal/tickets')
  }
}
