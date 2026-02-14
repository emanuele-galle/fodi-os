import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

const ADMIN_ROLES: Role[] = ['ADMIN', 'MANAGER']

const VALID_MODULES = ['crm', 'erp', 'pm', 'kb', 'content', 'support', 'admin']
const VALID_PERMISSIONS = ['read', 'write', 'delete', 'approve', 'admin']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role

    if (!ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

    const { id } = await params

    const permissions = await prisma.userPermission.findMany({
      where: { userId: id },
      select: { module: true, permission: true },
    })

    return NextResponse.json({ success: true, data: permissions })
  } catch (error) {
    console.error('[users/permissions/GET]', error)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role

    if (!ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

    const { id } = await params
    const currentUserId = request.headers.get('x-user-id')!

    // Cannot modify own permissions (privilege escalation prevention)
    if (id === currentUserId) {
      return NextResponse.json({ error: 'Non puoi modificare i tuoi permessi' }, { status: 400 })
    }

    // Managers cannot modify admin permissions
    const targetUser = await prisma.user.findUnique({ where: { id }, select: { role: true } })
    if (!targetUser) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }
    if (role === 'MANAGER' && targetUser.role === 'ADMIN') {
      return NextResponse.json({ error: 'Un Manager non puo modificare i permessi di un Admin' }, { status: 403 })
    }

    const body = await request.json()
    const { permissions } = body as { permissions: { module: string; permission: string }[] }

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Formato permessi non valido' }, { status: 400 })
    }

    // Validate all entries
    for (const p of permissions) {
      if (!VALID_MODULES.includes(p.module) || !VALID_PERMISSIONS.includes(p.permission)) {
        return NextResponse.json(
          { error: `Permesso non valido: ${p.module}/${p.permission}` },
          { status: 400 }
        )
      }
    }

    // Replace all permissions in a transaction
    await prisma.$transaction([
      prisma.userPermission.deleteMany({ where: { userId: id } }),
      ...permissions.map((p) =>
        prisma.userPermission.create({
          data: { userId: id, module: p.module, permission: p.permission },
        })
      ),
    ])

    const updated = await prisma.userPermission.findMany({
      where: { userId: id },
      select: { module: true, permission: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[users/permissions]', error)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
