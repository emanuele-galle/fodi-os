import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'
import { reorderLessonsSchema } from '@/lib/validation/training'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'training', 'write')

    const { id: courseId } = await params
    const body = await request.json()
    const parsed = reorderLessonsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    await prisma.$transaction(
      parsed.data.lessons.map((lesson) =>
        prisma.trainingLesson.update({
          where: { id: lesson.id, courseId },
          data: { sortOrder: lesson.sortOrder },
        })
      )
    )

    return NextResponse.json({ success: true, data: null })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/courses/id/lessons/reorder]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
