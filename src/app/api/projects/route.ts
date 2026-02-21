import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { slugify } from '@/lib/utils'
import { createProjectSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'pm', 'read')

    const { searchParams } = request.nextUrl
    const workspaceId = searchParams.get('workspaceId')
    const status = searchParams.get('status')
    const isInternal = searchParams.get('isInternal')
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    // ADMIN sees all projects; others see only projects they are members of
    const isAdminOrManager = role === 'ADMIN'
    const memberFilter = isAdminOrManager ? {} : { members: { some: { userId } } }

    const where = {
      isArchived: false,
      ...memberFilter,
      ...(workspaceId && { workspaceId }),
      ...(status && { status: status as never }),
      ...(isInternal !== null && { isInternal: isInternal === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [rawItems, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, companyName: true } },
          members: {
            include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
          },
          _count: { select: { tasks: true } },
        },
      }),
      prisma.project.count({ where }),
    ])

    // Add completedTasks count for each project
    const projectIds = rawItems.map((p) => p.id)
    const completedCounts = projectIds.length > 0
      ? await prisma.task.groupBy({
          by: ['projectId'],
          where: { projectId: { in: projectIds }, status: 'DONE' },
          _count: true,
        })
      : []
    const completedMap = new Map(completedCounts.map((c) => [c.projectId, c._count]))
    const items = rawItems.map((p) => ({ ...p, completedTasks: completedMap.get(p.id) || 0 }))

    return NextResponse.json({ success: true, data: items, items, total, page, limit })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const body = await request.json()
    const parsed = createProjectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { workspaceId, clientId, name, description, priority, startDate, endDate, deadline, budgetAmount, budgetHours, color, isInternal } = parsed.data

    const slug = slugify(name)

    const existing = await prisma.project.findUnique({ where: { slug }, select: { id: true } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Un progetto con questo nome esiste gia' }, { status: 409 })
    }

    const userId = request.headers.get('x-user-id')!

    // Auto-assign to default "Clienti" workspace if not provided
    let finalWorkspaceId = workspaceId
    if (!finalWorkspaceId) {
      let defaultWs = await prisma.workspace.findFirst({ where: { slug: 'clienti' } })
      if (!defaultWs) {
        defaultWs = await prisma.workspace.create({
          data: { name: 'Clienti', slug: 'clienti', description: 'Workspace predefinito per progetti clienti', color: '#6366F1' }
        })
      }
      finalWorkspaceId = defaultWs.id
    }

    const project = await prisma.project.create({
      data: {
        workspaceId: finalWorkspaceId,
        clientId,
        name,
        slug,
        description,
        priority,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        budgetAmount,
        budgetHours,
        color,
        isInternal,
        members: {
          create: [{ userId, role: 'OWNER' }],
        },
      },
      include: {
        client: { select: { id: true, companyName: true } },
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        },
        _count: { select: { tasks: true } },
      },
    })

    logActivity({ userId, action: 'CREATE', entityType: 'PROJECT', entityId: project.id, metadata: { name: project.name } })

    return NextResponse.json({ success: true, data: project }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
