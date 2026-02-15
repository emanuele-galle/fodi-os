import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { securityLogSchema } from '@/lib/validation/training'
import type { Role } from '@/generated/prisma/client'
import { Prisma } from '@/generated/prisma/client'

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')
    requirePermission(role, 'training', 'read')

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Utente non autenticato' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = securityLogSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || null

    await prisma.trainingSecurityLog.createMany({
      data: parsed.data.events.map((event) => ({
        userId,
        lessonId: event.lessonId ?? null,
        courseId: event.courseId ?? null,
        event: event.event,
        metadata: (event.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        ipAddress,
        userAgent,
      })),
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/security/log]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
