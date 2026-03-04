import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalClient, handlePortalError } from '@/lib/portal-auth'

export async function GET(request: NextRequest) {
  try {
    const client = await requirePortalClient(request)

    const projects = await prisma.project.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
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
        _count: { select: { tasks: true } },
        tasks: {
          where: { parentId: null },
          select: { status: true },
        },
      },
    })

    const items = projects.map(({ tasks, ...rest }) => {
      const totalTasks = tasks.length
      const completedTasks = tasks.filter((t) => t.status === 'DONE').length
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      return { ...rest, progress }
    })

    return NextResponse.json({ items, total: items.length })
  } catch (e) {
    return handlePortalError(e, 'portal/projects')
  }
}
