import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { updateProgressSchema } from '@/lib/validation/training'
import type { Role } from '@/generated/prisma/client'

export async function POST(
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
    const body = await request.json()
    const parsed = updateProgressSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { timeSpentSecs, videoProgressPct, isCompleted } = parsed.data

    const lesson = await prisma.trainingLesson.findUnique({
      where: { id: lessonId },
      select: { id: true, courseId: true },
    })

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Lezione non trovata' },
        { status: 404 }
      )
    }

    const existing = await prisma.trainingProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    })

    const upsertData: Record<string, unknown> = {
      lastAccessedAt: new Date(),
    }

    if (timeSpentSecs !== undefined) {
      upsertData.timeSpentSecs = (existing?.timeSpentSecs ?? 0) + timeSpentSecs
    }

    if (videoProgressPct !== undefined) {
      upsertData.videoProgressPct = Math.max(
        existing?.videoProgressPct ?? 0,
        videoProgressPct
      )
    }

    if (isCompleted) {
      upsertData.isCompleted = true
      upsertData.completedAt = new Date()
    }

    const progress = await prisma.trainingProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        lessonId,
        timeSpentSecs: timeSpentSecs ?? 0,
        videoProgressPct: videoProgressPct ?? 0,
        isCompleted: isCompleted ?? false,
        completedAt: isCompleted ? new Date() : null,
        lastAccessedAt: new Date(),
      },
      update: upsertData,
    })

    // Recalculate enrollment progress
    const totalLessons = await prisma.trainingLesson.count({
      where: { courseId: lesson.courseId },
    })

    const completedLessons = await prisma.trainingProgress.count({
      where: {
        userId,
        isCompleted: true,
        lesson: { courseId: lesson.courseId },
      },
    })

    const enrollmentProgress = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100 * 100) / 100
      : 0

    const allCompleted = totalLessons > 0 && completedLessons >= totalLessons

    await prisma.trainingEnrollment.updateMany({
      where: { userId, courseId: lesson.courseId },
      data: {
        progress: enrollmentProgress,
        ...(allCompleted && {
          status: 'COMPLETED',
          completedAt: new Date(),
        }),
      },
    })

    return NextResponse.json({ success: true, data: progress })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/progress]', e)
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
