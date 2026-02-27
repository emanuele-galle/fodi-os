import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const task = await prisma.task.findFirst({
      where: {
        timerUserId: userId,
        timerStartedAt: { not: null },
      },
      select: {
        id: true,
        title: true,
        timerStartedAt: true,
      },
    })

    if (!task) {
      return NextResponse.json({ active: false })
    }

    return NextResponse.json({
      active: true,
      taskId: task.id,
      taskTitle: task.title,
      timerStartedAt: task.timerStartedAt,
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tasks/active-timer]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
