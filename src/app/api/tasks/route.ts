import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createTaskSchema } from '@/lib/validation'
import { sseManager } from '@/lib/sse'
import { sendPush } from '@/lib/push'
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
    const scope = searchParams.get('scope') // 'assigned' | 'created' | 'all' (default: all my tasks)
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
    if (assigneeId) {
      where.OR = [
        ...(Array.isArray(where.OR) ? where.OR : []),
        { assigneeId },
        { assignments: { some: { userId: assigneeId } } },
      ]
    }
    if (projectId) where.projectId = projectId

    if (mine === 'true' && userId) {
      if (scope === 'assigned') {
        where.OR = [
          ...(Array.isArray(where.OR) ? where.OR : []),
          { assigneeId: userId },
          { assignments: { some: { userId: userId! } } },
        ]
      } else if (scope === 'created') {
        where.creatorId = userId
      } else {
        // Default: all my tasks (created + assigned + in assignments)
        where.OR = [
          ...(Array.isArray(where.OR) ? where.OR : []),
          { creatorId: userId },
          { assigneeId: userId },
          { assignments: { some: { userId: userId! } } },
        ]
      }
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
        orderBy: [{ priority: 'desc' }, { [sort]: order }],
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          assignments: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            },
            orderBy: { assignedAt: 'asc' },
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
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
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

    const { title, description, projectId, milestoneId, assigneeId, assigneeIds, priority, boardColumn, dueDate, estimatedHours, tags, isPersonal } = parsed.data

    // Default: se nessun assegnatario specificato, assegna al creatore
    const effectiveAssigneeId = assigneeId || (assigneeIds.length > 0 ? assigneeIds[0] : userId)

    const task = await prisma.task.create({
      data: {
        title,
        description,
        projectId: projectId || null,
        milestoneId: milestoneId || null,
        assigneeId: effectiveAssigneeId,
        creatorId: userId,
        priority,
        boardColumn,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours,
        tags,
        isPersonal: isPersonal ?? !projectId,
      },
    })

    // Collect all user IDs for assignments (include creator as default if no one specified)
    const allAssigneeIds = new Set(assigneeIds)
    if (assigneeId) allAssigneeIds.add(assigneeId)
    if (allAssigneeIds.size === 0) allAssigneeIds.add(userId)

    if (allAssigneeIds.size > 0) {
      await prisma.taskAssignment.createMany({
        data: Array.from(allAssigneeIds).map((uid: string) => ({
          taskId: task.id,
          userId: uid,
          role: 'assignee',
          assignedBy: userId,
        })),
        skipDuplicates: true,
      })

      const notifData = Array.from(allAssigneeIds)
        .filter((id: string) => id !== userId)
        .map((uid: string) => ({
          userId: uid,
          type: 'task_assigned',
          title: 'Task assegnato',
          message: `Ti è stato assegnato il task "${title}"`,
          link: '/tasks',
        }))
      if (notifData.length > 0) {
        await prisma.notification.createMany({ data: notifData })
        // SSE + Push: notify assigned users in real-time
        for (const nd of notifData) {
          sseManager.sendToUser(nd.userId, {
            type: 'notification',
            data: { type: nd.type, title: nd.title, message: nd.message, link: nd.link },
          })
          sendPush(nd.userId, { title: nd.title, message: nd.message, link: nd.link })
        }
      }
    }

    // Re-fetch with full includes
    const fullTask = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        assignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
          orderBy: { assignedAt: 'asc' },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(fullTask, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
