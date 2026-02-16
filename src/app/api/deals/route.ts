import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { createDealSchema } from '@/lib/validation/deals'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { searchParams } = request.nextUrl
    const stage = searchParams.get('stage')
    const clientId = searchParams.get('clientId')
    const ownerId = searchParams.get('ownerId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (stage) where.stage = { in: stage.split(',') }
    if (clientId) where.clientId = clientId
    if (ownerId) where.ownerId = ownerId

    const [items, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          client: { select: { id: true, companyName: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      prisma.deal.count({ where }),
    ])

    return NextResponse.json({ success: true, data: items, items, total, page, limit })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[deals/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const userId = request.headers.get('x-user-id')!
    const body = await request.json()
    const parsed = createDealSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { title, description, value, stage, probability, expectedCloseDate, clientId, contactId } = parsed.data

    const deal = await prisma.deal.create({
      data: {
        title,
        description,
        value,
        stage,
        probability,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        clientId,
        contactId: contactId || null,
        ownerId: userId,
      },
      include: {
        client: { select: { id: true, companyName: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    })

    logActivity({ userId, action: 'CREATE', entityType: 'DEAL', entityId: deal.id, metadata: { title, clientId } })

    return NextResponse.json({ success: true, data: deal }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[deals/POST]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
