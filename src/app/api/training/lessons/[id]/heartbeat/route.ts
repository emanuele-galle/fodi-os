import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { heartbeatSchema } from '@/lib/validation/training'
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
    const parsed = heartbeatSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { timeSpentSecs } = parsed.data

    await prisma.trainingProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        lessonId,
        timeSpentSecs,
        lastAccessedAt: new Date(),
      },
      update: {
        timeSpentSecs: { increment: timeSpentSecs },
        lastAccessedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/heartbeat]', e)
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
