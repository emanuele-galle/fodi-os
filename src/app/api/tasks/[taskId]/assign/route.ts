import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'
import { z } from 'zod'

const assignSchema = z.object({
  assigneeId: z.string().uuid('Assignee ID non valido'),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const { taskId } = await params
    const body = await request.json()
    const parsed = assignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { assigneeId } = parsed.data

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { assigneeId },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    })

    await prisma.notification.create({
      data: {
        userId: assigneeId,
        type: 'task_assigned',
        title: 'Task assegnato',
        message: `Ti e stato assegnato il task "${task.title}"`,
        link: '/tasks',
      },
    })

    return NextResponse.json(task)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
