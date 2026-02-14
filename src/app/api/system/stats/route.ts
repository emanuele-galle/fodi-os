import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'admin', 'read')

    const [
      totalUsers,
      activeUsers,
      clientsByStatus,
      projectsByStatus,
      recentLogins,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.client.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.project.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.user.findMany({
        where: { lastLoginAt: { not: null } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          avatarUrl: true,
          lastLoginAt: true,
        },
        orderBy: { lastLoginAt: 'desc' },
        take: 5,
      }),
    ])

    const clientsMap: Record<string, number> = {}
    clientsByStatus.forEach((c) => {
      clientsMap[c.status] = c._count.id
    })

    const projectsMap: Record<string, number> = {}
    projectsByStatus.forEach((p) => {
      projectsMap[p.status] = p._count.id
    })

    return NextResponse.json({
      users: { total: totalUsers, active: activeUsers },
      clients: clientsMap,
      projects: projectsMap,
      recentLogins,
      app: {
        name: 'FODI OS',
        version: process.env.APP_VERSION || '0.4.0',
        environment: process.env.NODE_ENV || 'development',
      },
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[system/stats]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
