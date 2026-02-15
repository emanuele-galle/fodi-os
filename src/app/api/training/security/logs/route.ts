import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role, Prisma } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'training', 'admin')

    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')
    const lessonId = searchParams.get('lessonId')
    const event = searchParams.get('event')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where: Prisma.TrainingSecurityLogWhereInput = {
      ...(userId && { userId }),
      ...(lessonId && { lessonId }),
      ...(event && { event }),
      ...((dateFrom || dateTo) && {
        createdAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo) }),
        },
      }),
    }

    const [items, total] = await Promise.all([
      prisma.trainingSecurityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.trainingSecurityLog.count({ where }),
    ])

    // Fetch user info for the logs
    const userIds = [...new Set(items.map((i) => i.userId))]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u]))

    const data = items.map((item) => ({
      ...item,
      user: userMap.get(item.userId) ?? null,
    }))

    return NextResponse.json({ success: true, data, total, page, limit })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/security/logs]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
