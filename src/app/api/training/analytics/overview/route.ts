import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'training', 'admin')

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [
      totalCourses,
      totalLessons,
      totalEnrollments,
      completedEnrollments,
      progressAgg,
      activeUsersResult,
    ] = await Promise.all([
      prisma.trainingCourse.count(),
      prisma.trainingLesson.count(),
      prisma.trainingEnrollment.count(),
      prisma.trainingEnrollment.count({ where: { status: 'COMPLETED' } }),
      prisma.trainingProgress.aggregate({ _avg: { timeSpentSecs: true } }),
      prisma.trainingProgress.findMany({
        where: { lastAccessedAt: { gte: thirtyDaysAgo } },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ])

    const completionRate = totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 10000) / 100
      : 0

    return NextResponse.json({
      success: true,
      data: {
        totalCourses,
        totalLessons,
        totalEnrollments,
        completionRate,
        averageTimeSpentSecs: progressAgg._avg.timeSpentSecs ?? 0,
        activeUsersLast30Days: activeUsersResult.length,
      },
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/analytics/overview]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
