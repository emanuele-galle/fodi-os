import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createTaskSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const { taskId } = await params

    const subtasks = await prisma.task.findMany({
      where: { parentId: taskId },
      orderBy: { sortOrder: 'asc' },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        assignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
          orderBy: { assignedAt: 'asc' },
        },
      },
    })

    return NextResponse.json({ success: true, items: subtasks })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tasks/:taskId/subtasks/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Utente non autenticato' }, { status: 401 })
    }

    const { taskId } = await params

    // Fetch parent task to inherit projectId and folderId
    const parent = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true, folderId: true, clientId: true },
    })
    if (!parent) {
      return NextResponse.json({ success: false, error: 'Task parent non trovato' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = createTaskSchema.safeParse({
      ...body,
      projectId: body.projectId || parent.projectId || undefined,
      parentId: taskId,
    })
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { title, description, priority, dueDate, assigneeId, assigneeIds } = parsed.data
    const effectiveAssigneeId = assigneeId || (assigneeIds.length > 0 ? assigneeIds[0] : userId)

    // Get max sort order for subtasks
    const maxOrder = await prisma.task.aggregate({
      where: { parentId: taskId },
      _max: { sortOrder: true },
    })

    const subtask = await prisma.task.create({
      data: {
        title,
        description,
        parentId: taskId,
        projectId: parent.projectId,
        folderId: parent.folderId,
        clientId: parent.clientId,
        assigneeId: effectiveAssigneeId,
        creatorId: userId,
        priority: priority || 'MEDIUM',
        boardColumn: 'todo',
        dueDate: dueDate ? new Date(dueDate) : null,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        assignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
          orderBy: { assignedAt: 'asc' },
        },
      },
    })

    // Create assignment for the assignee
    if (effectiveAssigneeId) {
      await prisma.taskAssignment.create({
        data: {
          taskId: subtask.id,
          userId: effectiveAssigneeId,
          role: 'assignee',
          assignedBy: userId,
        },
      }).catch(() => {}) // skip if duplicate
    }

    return NextResponse.json({ success: true, data: subtask }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tasks/:taskId/subtasks/POST]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
