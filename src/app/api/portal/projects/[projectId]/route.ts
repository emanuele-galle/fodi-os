import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalClient, handlePortalError } from '@/lib/portal-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const client = await requirePortalClient(request)
    const { projectId } = await params

    const project = await prisma.project.findFirst({
      where: { id: projectId, clientId: client.id },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        description: true,
        startDate: true,
        endDate: true,
        deadline: true,
        createdAt: true,
        tasks: {
          where: { parentId: null },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            milestoneId: true,
            _count: { select: { subtasks: true } },
          },
        },
        milestones: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            dueDate: true,
            status: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Progetto non trovato' }, { status: 404 })
    }

    const totalTasks = project.tasks.length
    const completedTasks = project.tasks.filter((t) => t.status === 'DONE').length
    const inProgressTasks = project.tasks.filter((t) => t.status === 'IN_PROGRESS').length
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    return NextResponse.json({
      ...project,
      progress,
      totalTasks,
      completedTasks,
      inProgressTasks,
    })
  } catch (e) {
    return handlePortalError(e, 'portal/projects/:projectId')
  }
}
