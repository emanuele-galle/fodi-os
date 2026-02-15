import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'
import { updateLessonSchema } from '@/lib/validation/training'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'training', 'read')

    const userId = request.headers.get('x-user-id')
    const { id } = await params

    const lesson = await prisma.trainingLesson.findUnique({
      where: { id },
      include: {
        quizzes: {
          orderBy: { sortOrder: 'asc' },
        },
        attachments: true,
        progress: userId ? {
          where: { userId },
          take: 1,
        } : false,
      },
    })

    if (!lesson) {
      return NextResponse.json({ success: false, error: 'Lezione non trovata' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: lesson })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/lessons/id]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'training', 'write')

    const { id } = await params
    const body = await request.json()
    const parsed = updateLessonSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const lesson = await prisma.trainingLesson.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json({ success: true, data: lesson })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/lessons/id/PATCH]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'training', 'delete')

    const { id } = await params

    await prisma.trainingLesson.delete({ where: { id } })

    return NextResponse.json({ success: true, data: null })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/lessons/id/DELETE]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
