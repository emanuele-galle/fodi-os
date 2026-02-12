import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

const DEFAULT_WORKSPACES = [
  { name: 'Amministrativo', slug: 'amministrativo', description: 'Workspace per progetti amministrativi', color: '#3B82F6', icon: 'briefcase', sortOrder: 1 },
  { name: 'Commerciale', slug: 'commerciale', description: 'Workspace per progetti commerciali', color: '#10B981', icon: 'trending-up', sortOrder: 2 },
  { name: 'Tecnico', slug: 'tecnico', description: 'Workspace per progetti tecnici', color: '#8B5CF6', icon: 'wrench', sortOrder: 3 },
  { name: 'Clienti', slug: 'clienti', description: 'Workspace predefinito per progetti clienti', color: '#6366F1', icon: 'users', sortOrder: 4 },
]

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'admin', 'admin')

    const results = []
    for (const ws of DEFAULT_WORKSPACES) {
      const existing = await prisma.workspace.findFirst({ where: { slug: ws.slug } })
      if (existing) {
        results.push({ ...existing, _status: 'already_exists' })
      } else {
        const created = await prisma.workspace.create({ data: ws })
        results.push({ ...created, _status: 'created' })
      }
    }

    return NextResponse.json({ workspaces: results }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
