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

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, email: true },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'Utente non trovato' }, { status: 404 })
    }

    const enrollments = await prisma.trainingEnrollment.findMany({
      where: { userId: id },
      include: {
        course: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Time spent per course
    const enrollmentData = await Promise.all(
      enrollments.map(async (enrollment) => {
        const progressRecords = await prisma.trainingProgress.findMany({
          where: { userId: id, lesson: { courseId: enrollment.courseId } },
          select: { timeSpentSecs: true },
        })
        const totalTimeSpentSecs = progressRecords.reduce((acc, p) => acc + p.timeSpentSecs, 0)

        return {
          id: enrollment.id,
          course: enrollment.course,
          status: enrollment.status,
          progress: enrollment.progress,
          totalTimeSpentSecs,
          completedAt: enrollment.completedAt,
          createdAt: enrollment.createdAt,
        }
      })
    )

    // Quiz scores per course
    const quizScores = await prisma.trainingQuizAnswer.findMany({
      where: { userId: id },
      include: {
        quiz: {
          select: { lesson: { select: { courseId: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const quizScoresByCourse: Record<string, { totalScore: number; count: number }> = {}
    for (const answer of quizScores) {
      const courseId = answer.quiz.lesson.courseId
      if (!quizScoresByCourse[courseId]) {
        quizScoresByCourse[courseId] = { totalScore: 0, count: 0 }
      }
      quizScoresByCourse[courseId].totalScore += answer.score
      quizScoresByCourse[courseId].count += 1
    }

    const quizScoresSummary = Object.entries(quizScoresByCourse).map(([courseId, data]) => ({
      courseId,
      averageScore: Math.round((data.totalScore / data.count) * 100) / 100,
      totalAnswers: data.count,
    }))

    // Recent activity
    const recentActivity = await prisma.trainingProgress.findMany({
      where: { userId: id },
      select: {
        id: true,
        lessonId: true,
        timeSpentSecs: true,
        isCompleted: true,
        lastAccessedAt: true,
        lesson: { select: { title: true, courseId: true } },
      },
      orderBy: { lastAccessedAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      success: true,
      data: {
        user,
        enrollments: enrollmentData,
        quizScores: quizScoresSummary,
        recentActivity,
      },
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/analytics/users/[id]]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
