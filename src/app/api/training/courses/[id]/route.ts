import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'
import { updateCourseSchema } from '@/lib/validation/training'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'training', 'read')

    const userId = request.headers.get('x-user-id')
    const { id } = await params

    const course = await prisma.trainingCourse.findUnique({
      where: { id },
      include: {
        category: true,
        lessons: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, title: true, slug: true, contentType: true, sortOrder: true, isPublished: true },
        },
        _count: { select: { enrollments: true } },
        enrollments: userId ? {
          where: { userId },
          take: 1,
        } : false,
      },
    })

    if (!course) {
      return NextResponse.json({ success: false, error: 'Corso non trovato' }, { status: 404 })
    }

    // If user is enrolled, get their lesson progress
    let lessonProgress: Record<string, boolean> = {}
    if (userId) {
      const progress = await prisma.trainingProgress.findMany({
        where: { userId, lesson: { courseId: id } },
        select: { lessonId: true, isCompleted: true },
      })
      lessonProgress = Object.fromEntries(progress.map(p => [p.lessonId, p.isCompleted]))
    }

    return NextResponse.json({ success: true, data: { ...course, lessonProgress } })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/courses/id]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'training', 'write')

    const { id } = await params
    const body = await request.json()
    const parsed = updateCourseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const course = await prisma.trainingCourse.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json({ success: true, data: course })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/courses/id/PATCH]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'training', 'delete')

    const { id } = await params

    await prisma.trainingCourse.delete({ where: { id } })

    return NextResponse.json({ success: true, data: null })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/courses/id/DELETE]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
