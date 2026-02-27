import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { updateProjectSchema } from '@/lib/validation'
import type { Role, Prisma } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'pm', 'read')

    const { projectId } = await params

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: { select: { id: true, name: true } },
        client: { select: { id: true, companyName: true } },
        milestones: { orderBy: { sortOrder: 'asc' } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, role: true, avatarUrl: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            assignments: {
              include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
              orderBy: { assignedAt: 'asc' },
            },
            dependsOn: true,
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        },
        _count: { select: { tasks: true } },
      },
    })

    if (!project) {
      return NextResponse.json({ success: false, error: 'Progetto non trovato' }, { status: 404 })
    }

    // Non-admin users can only see projects they are members of
    const isAdminOrManager = role === 'ADMIN'
    if (!isAdminOrManager) {
      const isMember = project.members.some((m) => m.userId === userId)
      if (!isMember) {
        return NextResponse.json({ success: false, error: 'Non hai accesso a questo progetto' }, { status: 403 })
      }
    }

    // Get task counts by status
    const tasksByStatus = await prisma.task.groupBy({
      by: ['status'],
      where: { projectId },
      _count: true,
    })

    return NextResponse.json({ success: true, data: { ...project, tasksByStatus }, ...project, tasksByStatus })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const { projectId } = await params

    // Check project exists
    const existing = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Progetto non trovato' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateProjectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { name, description, status, priority, startDate, endDate, deadline, budgetAmount, budgetHours, color, clientId, workspaceId } = parsed.data

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (description !== undefined) data.description = description
    if (status !== undefined) data.status = status
    if (priority !== undefined) data.priority = priority
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null
    if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null
    if (budgetAmount !== undefined) data.budgetAmount = budgetAmount
    if (budgetHours !== undefined) data.budgetHours = budgetHours
    if (color !== undefined) data.color = color
    if (clientId !== undefined) data.clientId = clientId
    if (workspaceId !== undefined) data.workspaceId = workspaceId

    const project = await prisma.project.update({
      where: { id: projectId },
      data: data as Prisma.ProjectUpdateInput,
    })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'UPDATE', entityType: 'PROJECT', entityId: projectId, metadata: { name: project.name } })

    return NextResponse.json({ success: true, data: project })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/PATCH]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'delete')

    const { projectId } = await params

    // Check project exists
    const existing = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Progetto non trovato' }, { status: 404 })
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { isArchived: true },
    })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'ARCHIVE', entityType: 'PROJECT', entityId: projectId })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/DELETE]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
