import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthHeaders } from '@/lib/api-utils'
import { hasPermission } from '@/lib/permissions'
import { updateRoleSchema } from '@/lib/validation/roles'
import { invalidateCustomRoleCache } from '@/lib/permission-resolver'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> },
) {
  try {
    const auth = getAuthHeaders(request)
    if (!auth.ok) return auth.response

    if (!hasPermission(auth.role, 'admin', 'read')) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

    const { roleId } = await params

    const role = await prisma.customRole.findUnique({
      where: { id: roleId },
      include: {
        _count: { select: { users: true } },
        users: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
          take: 50,
        },
      },
    })

    if (!role) {
      return NextResponse.json({ error: 'Ruolo non trovato' }, { status: 404 })
    }

    return NextResponse.json({ data: role })
  } catch (error) {
    console.error('[api/roles/[roleId] GET]', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> },
) {
  try {
    const auth = getAuthHeaders(request)
    if (!auth.ok) return auth.response

    if (!hasPermission(auth.role, 'admin', 'admin')) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

    const { roleId } = await params

    const existing = await prisma.customRole.findUnique({ where: { id: roleId } })
    if (!existing) {
      return NextResponse.json({ error: 'Ruolo non trovato' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateRoleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    // Check name uniqueness if name is being changed
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const nameConflict = await prisma.customRole.findUnique({ where: { name: parsed.data.name } })
      if (nameConflict) {
        return NextResponse.json({ error: 'Un ruolo con questo nome esiste già' }, { status: 409 })
      }
    }

    const role = await prisma.customRole.update({
      where: { id: roleId },
      data: parsed.data,
    })

    // Invalidate cache so users with this role get updated permissions
    invalidateCustomRoleCache(roleId)

    return NextResponse.json({ data: role })
  } catch (error) {
    console.error('[api/roles/[roleId] PATCH]', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roleId: string }> },
) {
  try {
    const auth = getAuthHeaders(request)
    if (!auth.ok) return auth.response

    if (!hasPermission(auth.role, 'admin', 'admin')) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

    const { roleId } = await params

    const role = await prisma.customRole.findUnique({
      where: { id: roleId },
      include: { _count: { select: { users: true } } },
    })

    if (!role) {
      return NextResponse.json({ error: 'Ruolo non trovato' }, { status: 404 })
    }

    if (role.isSystem) {
      return NextResponse.json({ error: 'I ruoli di sistema non possono essere eliminati' }, { status: 403 })
    }

    if (role._count.users > 0) {
      return NextResponse.json(
        { error: `Il ruolo è assegnato a ${role._count.users} utente/i. Riassegnali prima di eliminare.` },
        { status: 409 },
      )
    }

    await prisma.customRole.delete({ where: { id: roleId } })
    invalidateCustomRoleCache(roleId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/roles/[roleId] DELETE]', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
