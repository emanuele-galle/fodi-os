import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  const role = request.headers.get('x-user-role') as Role
  const userId = request.headers.get('x-user-id')!

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const filterUserId = searchParams.get('userId') || undefined
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const skip = (page - 1) * limit

  const isAdmin = role === 'ADMIN' || role === 'MANAGER' || role === 'PM'

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}

  // Non-admin can only see their own reports
  if (!isAdmin) {
    where.userId = userId
  } else if (filterUserId) {
    where.userId = filterUserId
  }

  if (dateFrom || dateTo) {
    where.date = {
      ...(dateFrom && { gte: new Date(dateFrom) }),
      ...(dateTo && { lte: new Date(dateTo) }),
    }
  }

  const [items, total] = await Promise.all([
    prisma.dailyReport.findMany({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
        },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.dailyReport.count({ where }),
  ])

  return NextResponse.json({
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}
