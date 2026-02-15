import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'training', 'admin')

    const { id } = await params

    const course = await prisma.trainingCourse.findUnique({
      where: { id },
      include: { lessons: { select: { id: true, title: true } } },
    })

    if (!course) {
      return NextResponse.json({ success: false, error: 'Corso non trovato' }, { status: 404 })
    }

    const [totalEnrollments, completedEnrollments, enrollmentAgg] = await Promise.all([
      prisma.trainingEnrollment.count({ where: { courseId: id } }),
      prisma.trainingEnrollment.count({ where: { courseId: id, status: 'COMPLETED' } }),
      prisma.trainingEnrollment.aggregate({ where: { courseId: id }, _avg: { progress: true } }),
    ])

    const completionRate = totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 10000) / 100
      : 0

    const lessonIds = course.lessons.map((l) => l.id)

    // Average time spent per user across all lessons in this course, then overall avg
    const userTimeSpent = await prisma.trainingProgress.groupBy({
      by: ['userId'],
      where: { lessonId: { in: lessonIds } },
      _sum: { timeSpentSecs: true },
    })

    const averageTimeSpentSecs = userTimeSpent.length > 0
      ? Math.round(userTimeSpent.reduce((acc, u) => acc + (u._sum.timeSpentSecs ?? 0), 0) / userTimeSpent.length)
      : 0

    // Average quiz score
    const quizScoreAgg = await prisma.trainingQuizAnswer.aggregate({
      where: { quiz: { lesson: { courseId: id } } },
      _avg: { score: true },
    })

    // Per-lesson stats
    const lessonStats = await Promise.all(
      course.lessons.map(async (lesson) => {
        const [completionCount, timeAgg] = await Promise.all([
          prisma.trainingProgress.count({ where: { lessonId: lesson.id, isCompleted: true } }),
          prisma.trainingProgress.aggregate({ where: { lessonId: lesson.id }, _avg: { timeSpentSecs: true } }),
        ])
        return {
          lessonId: lesson.id,
          title: lesson.title,
          completionCount,
          avgTimeSpentSecs: timeAgg._avg.timeSpentSecs ?? 0,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        totalEnrollments,
        completedEnrollments,
        completionRate,
        averageProgress: enrollmentAgg._avg.progress ?? 0,
        averageTimeSpentSecs,
        averageQuizScore: quizScoreAgg._avg.score ?? 0,
        lessonStats,
      },
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/analytics/courses/[id]]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
