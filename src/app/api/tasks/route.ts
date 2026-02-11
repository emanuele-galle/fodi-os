import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createTaskSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const userId = request.headers.get('x-user-id')
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const sort = searchParams.get('sort') || 'createdAt'
    const order = searchParams.get('order') || 'desc'
    const assigneeId = searchParams.get('assigneeId')
    const projectId = searchParams.get('projectId')
    const mine = searchParams.get('mine')
    const personal = searchParams.get('personal')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = { in: status.split(',').map((s) => s.trim()) }
    }
    if (priority) {
      where.priority = { in: priority.split(',').map((s) => s.trim()) }
    }
    if (assigneeId) where.assigneeId = assigneeId
    if (projectId) where.projectId = projectId

    if (mine === 'true' && userId) {
      where.OR = [{ creatorId: userId }, { assigneeId: userId }]
    }

    if (personal === 'true') {
      where.isPersonal = true
      where.projectId = null
    }

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort]: order },
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          project: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.task.count({ where }),
    ])

    return NextResponse.json({ items, total })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Utente non autenticato' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createTaskSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { title, description, projectId, milestoneId, assigneeId, priority, boardColumn, dueDate, estimatedHours, tags, isPersonal } = parsed.data

    const task = await prisma.task.create({
      data: {
        title,
        description,
        projectId: projectId || null,
        milestoneId: milestoneId || null,
        assigneeId: assigneeId || null,
        creatorId: userId,
        priority,
        boardColumn,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours,
        tags,
        isPersonal: isPersonal ?? !projectId,
      },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
