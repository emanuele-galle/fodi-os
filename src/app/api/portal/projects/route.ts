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
        startDate: true,
        endDate: true,
        deadline: true,
        createdAt: true,
        _count: { select: { tasks: true } },
      },
    })

    return NextResponse.json({ items: projects, total: projects.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
