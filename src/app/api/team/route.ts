import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    if (!role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = request.nextUrl.searchParams.get('workspace') || undefined

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(workspaceId && {
          workspaceMembers: { some: { workspaceId } },
        }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        avatarUrl: true,
        phone: true,
        lastLoginAt: true,
        workspaceMembers: {
          select: {
            workspace: { select: { id: true, name: true, color: true } },
            role: true,
          },
        },
        _count: {
          select: {
            assignedTasks: { where: { status: { in: ['TODO', 'IN_PROGRESS'] } } },
            timeEntries: true,
          },
        },
      },
      orderBy: { firstName: 'asc' },
    })

    const items = users.map((u) => ({
      ...u,
      totalTasks: u._count.assignedTasks,
      totalTimeEntries: u._count.timeEntries,
    }))

    return NextResponse.json({ items, total: items.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
