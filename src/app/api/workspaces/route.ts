import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!

    // ADMIN sees all workspaces, others see only their own
    const where = role === 'ADMIN'
      ? {}
      : { members: { some: { userId } } }

    const workspaces = await prisma.workspace.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { members: true, projects: true } },
      },
    })

    return NextResponse.json({ items: workspaces, total: workspaces.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
