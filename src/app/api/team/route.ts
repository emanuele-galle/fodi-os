import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    if (!role) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // CLIENT role gets limited team view (no email, phone, login details)
    const isClient = role === 'CLIENT'

    const workspaceId = request.nextUrl.searchParams.get('workspace') || undefined

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(isClient && { role: { not: 'CLIENT' } }),
        ...(workspaceId && {
          workspaceMembers: { some: { workspaceId } },
        }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: !isClient,
        role: true,
        avatarUrl: true,
        phone: !isClient,
        lastLoginAt: !isClient,
        ...(!isClient && {
          workspaceMembers: {
            select: {
              workspace: { select: { id: true, name: true, color: true } },
              role: true,
            },
          },
        }),
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
