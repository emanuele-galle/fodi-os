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
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    // ADMIN/MANAGER see all activity, others see only their own
    const isAdmin = role === 'ADMIN' || role === 'MANAGER'

    const where = {
      ...(!isAdmin && { userId }),
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
    }

    const items = await prisma.activityLog.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json({ items, total: items.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
