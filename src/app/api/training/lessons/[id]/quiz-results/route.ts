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
    const userId = request.headers.get('x-user-id')
    requirePermission(role, 'training', 'read')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Utente non autenticato' },
        { status: 400 }
      )
    }

    const { id: lessonId } = await params

    const quizzes = await prisma.trainingQuiz.findMany({
      where: { lessonId },
      orderBy: { sortOrder: 'asc' },
    })

    if (quizzes.length === 0) {
      return NextResponse.json({
        success: true,
        data: { quizzes: [], totalScore: 0, maxScore: 0, percentage: 0 },
      })
    }

    const quizIds = quizzes.map((q) => q.id)

    // Get user's latest answer for each quiz
    const latestAnswers = await prisma.trainingQuizAnswer.findMany({
      where: { userId, quizId: { in: quizIds } },
      orderBy: { createdAt: 'desc' },
    })

    // Keep only the latest answer per quiz
    const answerMap = new Map<string, typeof latestAnswers[0]>()
    for (const ans of latestAnswers) {
      if (!answerMap.has(ans.quizId)) {
        answerMap.set(ans.quizId, ans)
      }
    }

    let totalScore = 0
    const maxScore = quizzes.length

    const results = quizzes.map((quiz) => {
      const userAnswer = answerMap.get(quiz.id) ?? null
      if (userAnswer?.isCorrect) totalScore++
      return {
        quiz,
        userAnswer,
        isCorrect: userAnswer?.isCorrect ?? null,
      }
    })

    const percentage = maxScore > 0
      ? Math.round((totalScore / maxScore) * 100 * 100) / 100
      : 0

    return NextResponse.json({
      success: true,
      data: { quizzes: results, totalScore, maxScore, percentage },
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/quiz-results]', e)
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
