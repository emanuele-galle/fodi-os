import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'training', 'admin')

    const { searchParams } = request.nextUrl
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
          trainingEnrollments: { some: {} },
        }
      : { trainingEnrollments: { some: {} } }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          trainingEnrollments: {
            select: { status: true },
          },
          trainingProgress: {
            select: { timeSpentSecs: true, lastAccessedAt: true },
          },
        },
        orderBy: { lastName: 'asc' },
      }),
      prisma.user.count({ where }),
    ])

    const data = users.map((user) => {
      const coursesStarted = user.trainingEnrollments.length
      const coursesCompleted = user.trainingEnrollments.filter((e) => e.status === 'COMPLETED').length
      const totalTimeSpentSecs = user.trainingProgress.reduce((acc, p) => acc + p.timeSpentSecs, 0)
      const lastActivityAt = user.trainingProgress.length > 0
        ? user.trainingProgress.reduce((latest, p) =>
            p.lastAccessedAt > latest ? p.lastAccessedAt : latest, user.trainingProgress[0].lastAccessedAt)
        : null

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        coursesStarted,
        coursesCompleted,
        totalTimeSpentSecs,
        lastActivityAt,
      }
    })

    return NextResponse.json({ success: true, data, total, page, limit })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/analytics/users]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
