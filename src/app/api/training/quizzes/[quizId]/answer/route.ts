import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { answerQuizSchema } from '@/lib/validation/training'
import type { Role } from '@/generated/prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
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

    const { quizId } = await params
    const body = await request.json()
    const parsed = answerQuizSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { answer } = parsed.data

    const quiz = await prisma.trainingQuiz.findUnique({
      where: { id: quizId },
      select: { id: true, type: true, correctAnswer: true, explanation: true },
    })

    if (!quiz) {
      return NextResponse.json(
        { success: false, error: 'Quiz non trovato' },
        { status: 404 }
      )
    }

    let isCorrect = false
    const correctAnswer = quiz.correctAnswer

    if (quiz.type === 'MULTIPLE_CHOICE') {
      const userArr = (Array.isArray(answer) ? answer : [answer]).sort()
      const correctArr = (Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]).map(String).sort()
      isCorrect = JSON.stringify(userArr) === JSON.stringify(correctArr)
    } else {
      const userStr = Array.isArray(answer) ? answer[0] : answer
      const correctStr = Array.isArray(correctAnswer) ? correctAnswer[0] : String(correctAnswer)
      isCorrect = userStr === correctStr
    }

    const score = isCorrect ? 1 : 0

    const attemptCount = await prisma.trainingQuizAnswer.count({
      where: { userId, quizId },
    })

    const quizAnswer = await prisma.trainingQuizAnswer.create({
      data: {
        userId,
        quizId,
        answer: answer as never,
        isCorrect,
        score,
        attempt: attemptCount + 1,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: quizAnswer.id,
        isCorrect,
        score,
        correctAnswer: quiz.correctAnswer,
        explanation: quiz.explanation,
      },
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/quiz/answer]', e)
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
