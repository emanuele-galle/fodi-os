import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'portal', 'read')

    // Find client linked to this portal user
    const client = await prisma.client.findUnique({
      where: { portalUserId: userId },
    })

    if (!client) {
      return NextResponse.json({ error: 'No client linked to this portal user' }, { status: 404 })
    }

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
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[portal/projects]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
