import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Workspaces are organizational structures visible to all authenticated users
    const workspaces = await prisma.workspace.findMany({
      where: {},
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { members: true, projects: true } },
      },
    })

    return NextResponse.json({ items: workspaces, total: workspaces.length })
  } catch (e) {
    console.error('[workspaces]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
