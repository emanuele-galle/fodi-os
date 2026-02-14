import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createTaskSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const { projectId } = await params
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const assigneeId = searchParams.get('assigneeId')
    const milestoneId = searchParams.get('milestoneId')
    const boardColumn = searchParams.get('boardColumn')

    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        parentId: null, // Only top-level tasks
        ...(status && { status: status as never }),
        ...(assigneeId && {
          OR: [
            { assigneeId },
            { assignments: { some: { userId: assigneeId } } },
          ],
        }),
        ...(milestoneId && { milestoneId }),
        ...(boardColumn && { boardColumn }),
      },
      orderBy: [{ priority: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        assignments: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
          orderBy: { assignedAt: 'asc' },
        },
        _count: { select: { subtasks: true, comments: true } },
      },
    })

    return NextResponse.json({ items: tasks })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/:projectId/tasks]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const { projectId } = await params
    const userId = request.headers.get('x-user-id')!
    const body = await request.json()
    const parsed = createTaskSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { title, description, milestoneId, folderId, assigneeId, assigneeIds, priority, boardColumn, dueDate, estimatedHours, tags } = parsed.data

    // Default: se nessun assegnatario specificato, assegna al creatore
    const effectiveAssigneeIds = assigneeIds?.length ? assigneeIds : assigneeId ? [assigneeId] : [userId]

    const task = await prisma.task.create({
      data: {
        projectId,
        creatorId: userId,
        title,
        description,
        milestoneId,
        folderId,
        assigneeId: effectiveAssigneeIds[0],
        priority,
        boardColumn,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        estimatedHours,
        tags: tags || [],
        ...(effectiveAssigneeIds.length > 0 && {
          assignments: {
            createMany: {
              data: effectiveAssigneeIds.map((uid: string) => ({
                userId: uid,
                role: 'assignee',
                assignedBy: userId,
              })),
            },
          },
        }),
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        assignments: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        },
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/:projectId/tasks]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
