import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

function escapeCsv(value: unknown): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'training', 'admin')

    const type = request.nextUrl.searchParams.get('type')

    if (!type || !['enrollments', 'progress', 'quizzes'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Parametro type richiesto: enrollments | progress | quizzes' },
        { status: 400 }
      )
    }

    let csv = ''

    if (type === 'enrollments') {
      csv = 'ID,Utente,Email,Corso,Stato,Progresso,Iscrizione,Completamento\n'
      const rows = await prisma.trainingEnrollment.findMany({
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          course: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      for (const r of rows) {
        csv += [
          r.id,
          escapeCsv(`${r.user.firstName} ${r.user.lastName}`),
          escapeCsv(r.user.email),
          escapeCsv(r.course.title),
          r.status,
          r.progress,
          r.createdAt.toISOString(),
          r.completedAt?.toISOString() ?? '',
        ].join(',') + '\n'
      }
    } else if (type === 'progress') {
      csv = 'ID,Utente,Email,Lezione,TempoSec,Completata,UltimoAccesso\n'
      const rows = await prisma.trainingProgress.findMany({
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          lesson: { select: { title: true } },
        },
        orderBy: { lastAccessedAt: 'desc' },
      })
      for (const r of rows) {
        csv += [
          r.id,
          escapeCsv(`${r.user.firstName} ${r.user.lastName}`),
          escapeCsv(r.user.email),
          escapeCsv(r.lesson.title),
          r.timeSpentSecs,
          r.isCompleted,
          r.lastAccessedAt.toISOString(),
        ].join(',') + '\n'
      }
    } else {
      csv = 'ID,Utente,Email,Quiz,Risposta,Corretta,Punteggio,Tentativo,Data\n'
      const rows = await prisma.trainingQuizAnswer.findMany({
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          quiz: { select: { question: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      for (const r of rows) {
        csv += [
          r.id,
          escapeCsv(`${r.user.firstName} ${r.user.lastName}`),
          escapeCsv(r.user.email),
          escapeCsv(r.quiz.question),
          escapeCsv(JSON.stringify(r.answer)),
          r.isCorrect,
          r.score,
          r.attempt,
          r.createdAt.toISOString(),
        ].join(',') + '\n'
      }
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="training-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/analytics/export]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
