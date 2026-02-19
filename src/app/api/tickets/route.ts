import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createTicketSchema } from '@/lib/validation'
import { notifyUsers } from '@/lib/notifications'
import { sendDataChanged } from '@/lib/sse'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'support', 'read')

    const { searchParams } = request.nextUrl
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const assigneeId = searchParams.get('assigneeId')
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where = {
      ...(clientId && { clientId }),
      ...(status && { status: { in: status.split(',').map((s) => s.trim()) } as never }),
      ...(priority && { priority: { in: priority.split(',').map((s) => s.trim()) } as never }),
      ...(assigneeId && { assigneeId }),
      ...(search && {
        OR: [
          { subject: { contains: search, mode: 'insensitive' as const } },
          { number: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [items, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, companyName: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ])

    return NextResponse.json({ success: true, data: items, items, total, page, limit })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tickets]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'support', 'write')

    const body = await request.json()
    const parsed = createTicketSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { clientId, projectId, subject, description, priority, category } = parsed.data

    // Generate ticket number: T-YYYY-NNN
    const year = new Date().getFullYear()
    const count = await prisma.ticket.count({
      where: {
        number: { startsWith: `T-${year}-` },
      },
    })
    const number = `T-${year}-${String(count + 1).padStart(3, '0')}`

    const ticket = await prisma.ticket.create({
      data: {
        clientId,
        projectId: projectId || null,
        creatorId: userId,
        number,
        subject,
        description,
        priority: priority || 'MEDIUM',
        category: category || 'general',
      },
      include: {
        client: { select: { id: true, companyName: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    // Notify support team (ADMIN + SUPPORT roles) about new ticket
    const supportUsers = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPPORT'] },
        isActive: true,
      },
      select: { id: true },
    })
    await notifyUsers(
      supportUsers.map((u) => u.id),
      userId,
      {
        type: 'ticket_created',
        title: 'Nuovo ticket',
        message: `Nuovo ticket "${subject}" (${number})`,
        link: `/support/${ticket.id}`,
        metadata: { clientName: ticket.client?.companyName, ticketNumber: ticket.number },
      }
    )

    // Notify connected users about new ticket
    sendDataChanged(supportUsers.map((u) => u.id), 'ticket', ticket.id)

    return NextResponse.json({ success: true, data: ticket }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tickets]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
