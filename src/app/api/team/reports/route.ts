import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Role, Prisma } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = request.nextUrl
    const filterUserId = searchParams.get('userId') || undefined
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const isAdmin = ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'PM'].includes(role)

    // Build where clause
    const where: Prisma.DailyReportWhereInput = {}

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
  } catch (error) {
    console.error('[team/reports/GET]', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
