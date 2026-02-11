import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { updateTaskSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const { taskId } = await params

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true } },
        subtasks: {
          orderBy: { sortOrder: 'asc' },
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        },
        timeEntries: {
          orderBy: { date: 'desc' },
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        dependsOn: {
          include: { dependsOn: { select: { id: true, title: true, status: true } } },
        },
        dependedOnBy: {
          include: { task: { select: { id: true, title: true, status: true } } },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
          include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const { taskId } = await params
    const body = await request.json()
    const parsed = updateTaskSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { title, description, status, priority, boardColumn, assigneeId, milestoneId, dueDate, estimatedHours, sortOrder, tags } = parsed.data

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (status !== undefined) {
      data.status = status
      if (status === 'DONE') data.completedAt = new Date()
      else data.completedAt = null
    }
    if (priority !== undefined) data.priority = priority
    if (boardColumn !== undefined) data.boardColumn = boardColumn
    if (assigneeId !== undefined) data.assigneeId = assigneeId
    if (milestoneId !== undefined) data.milestoneId = milestoneId
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
    if (estimatedHours !== undefined) data.estimatedHours = estimatedHours
    if (sortOrder !== undefined) data.sortOrder = sortOrder
    if (tags !== undefined) data.tags = tags

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    })

    return NextResponse.json(task)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'delete')

    const { taskId } = await params

    await prisma.task.delete({ where: { id: taskId } })

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
