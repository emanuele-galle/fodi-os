import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
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
        ...(assigneeId && { assigneeId }),
        ...(milestoneId && { milestoneId }),
        ...(boardColumn && { boardColumn }),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        _count: { select: { subtasks: true, comments: true } },
      },
    })

    return NextResponse.json({ items: tasks })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const { projectId } = await params
    const userId = request.headers.get('x-user-id')!
    const body = await request.json()
    const { title, description, milestoneId, assigneeId, priority, boardColumn, dueDate, estimatedHours, tags } = body

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        creatorId: userId,
        title,
        description,
        milestoneId,
        assigneeId,
        priority,
        boardColumn,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        estimatedHours,
        tags: tags || [],
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
