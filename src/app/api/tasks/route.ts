import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createTaskSchema } from '@/lib/validation'
import { dispatchNotification } from '@/lib/notifications'
import { sendBadgeUpdate, sendDataChanged } from '@/lib/sse'
import { pushTaskToMicrosoftTodo } from '@/lib/microsoft-sync'
import type { Role } from '@/generated/prisma/client'

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
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
    const scope = searchParams.get('scope') // 'assigned' | 'created' | 'delegated' | 'all' (default: all my tasks)
    const personal = searchParams.get('personal')
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { parentId: null }

    if (search && search.trim().length >= 2) {
      where.title = { contains: search.trim(), mode: 'insensitive' }
    }

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

    const crmOnly = searchParams.get('crmOnly')
    if (crmOnly === 'true') {
      where.clientId = { not: null }
    }

    const clientId = searchParams.get('clientId')
    if (clientId) where.clientId = clientId

    if (mine === 'true' && userId) {
      if (scope === 'assigned') {
        // Task effettivamente assegnate a me (assignments è la fonte di verità)
        where.assignments = { some: { userId: userId! } }
      } else if (scope === 'created') {
        where.creatorId = userId
      } else if (scope === 'delegated') {
        // Tasks created by me but where I'm NOT in the assignments
        where.creatorId = userId
        where.assignments = { none: { userId: userId! } }
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

    // Team view: non-ADMIN users should only see tasks from their projects + assigned/created by them
    if (mine !== 'true' && personal !== 'true' && role !== 'ADMIN' && userId) {
      const userProjects = await prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      })
      const userProjectIds = userProjects.map((p) => p.projectId)

      where.OR = [
        ...(Array.isArray(where.OR) ? where.OR : []),
        { projectId: { in: userProjectIds } },
        { assigneeId: userId },
        { assignments: { some: { userId } } },
        { creatorId: userId },
        { isPersonal: true, creatorId: userId },
      ]
    }

    if (personal === 'true') {
      where.isPersonal = true
      where.projectId = null
    }

    // Allow fetching subtasks explicitly
    const includeSubtasks = searchParams.get('includeSubtasks')
    if (includeSubtasks === 'true') {
      delete where.parentId
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
          creator: {
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
          client: {
            select: { id: true, companyName: true },
          },
          _count: {
            select: { comments: true, subtasks: true },
          },
        },
      }),
      prisma.task.count({ where }),
    ])

    return NextResponse.json({ success: true, data: items, items, total, page, limit })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tasks/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Utente non autenticato' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createTaskSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { title, description, projectId, milestoneId, assigneeId, assigneeIds, priority, boardColumn, dueDate, estimatedHours, tags, isPersonal, clientId, taskType, parentId } = parsed.data

    // Default: se nessun assegnatario specificato, assegna al creatore
    const effectiveAssigneeId = assigneeId || (assigneeIds.length > 0 ? assigneeIds[0] : userId)

    const task = await prisma.task.create({
      data: {
        title,
        description,
        projectId: projectId || null,
        milestoneId: milestoneId || null,
        clientId: clientId || null,
        parentId: parentId || null,
        assigneeId: effectiveAssigneeId,
        creatorId: userId,
        priority,
        boardColumn,
        taskType: taskType || 'GENERAL',
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

      let projectName: string | undefined
      if (task.projectId) {
        const proj = await prisma.project.findUnique({ where: { id: task.projectId }, select: { name: true } })
        projectName = proj?.name ?? undefined
      }

      // Notify assignees about task assignment (no more task_created to entire project)
      await dispatchNotification({
        type: 'task_assigned',
        title: 'Task assegnato',
        message: `Ti è stato assegnato il task "${title}"`,
        link: `/tasks?taskId=${task.id}`,
        metadata: { projectName, priority: priority || 'MEDIUM' },
        projectId: task.projectId ?? undefined,
        groupKey: `task_assigned:${task.id}`,
        recipientIds: Array.from(allAssigneeIds),
        excludeUserId: userId,
      })
    }

    // Send badge_update for assignees with fresh task count
    for (const uid of allAssigneeIds) {
      if (uid === userId) continue
      const count = await prisma.task.count({
        where: {
          status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] },
          OR: [{ assigneeId: uid }, { assignments: { some: { userId: uid } } }],
        },
      })
      sendBadgeUpdate(uid, { tasks: count })
    }

    // Notify all connected users about data change
    sendDataChanged([...allAssigneeIds, userId], 'task', task.id)

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

    // Sync to Microsoft To Do (fire-and-forget)
    pushTaskToMicrosoftTodo(task.id, 'create').catch(() => {})

    return NextResponse.json({ success: true, data: fullTask }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[tasks/POST]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
