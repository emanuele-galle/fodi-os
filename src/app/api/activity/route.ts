import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!

    const { searchParams } = request.nextUrl
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const action = searchParams.get('action')
    const filterUserId = searchParams.get('userId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    // ADMIN sees all activity, others see only their own
    const isAdmin = role === 'ADMIN'

    const where = {
      ...(!isAdmin && { userId }),
      ...(isAdmin && filterUserId && { userId: filterUserId }),
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(action && { action }),
    }

    const [items, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      prisma.activityLog.count({ where }),
    ])

    return NextResponse.json({ items, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (e) {
    console.error('[activity]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
