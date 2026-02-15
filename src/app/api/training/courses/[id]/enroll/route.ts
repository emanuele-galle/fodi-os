import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
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

    const { id: courseId } = await params

    const course = await prisma.trainingCourse.findUnique({
      where: { id: courseId },
      select: { id: true, isPublished: true },
    })

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Corso non trovato' },
        { status: 404 }
      )
    }

    if (!course.isPublished) {
      return NextResponse.json(
        { success: false, error: 'Corso non pubblicato' },
        { status: 400 }
      )
    }

    const existing = await prisma.trainingEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    })

    if (existing) {
      return NextResponse.json({ success: true, data: existing })
    }

    const enrollment = await prisma.trainingEnrollment.create({
      data: {
        userId,
        courseId,
        status: 'IN_PROGRESS',
        progress: 0,
      },
    })

    return NextResponse.json({ success: true, data: enrollment }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/enroll]', e)
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
