import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthHeaders } from '@/lib/api-utils'
import { hasPermission } from '@/lib/permissions'
import { createRoleSchema } from '@/lib/validation/roles'

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthHeaders(request)
    if (!auth.ok) return auth.response

    if (!hasPermission(auth.role, 'admin', 'read')) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

    const roles = await prisma.customRole.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { users: true } },
      },
    })

    return NextResponse.json({ items: roles })
  } catch (error) {
    console.error('[api/roles GET]', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthHeaders(request)
    if (!auth.ok) return auth.response

    if (!hasPermission(auth.role, 'admin', 'admin')) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createRoleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const existing = await prisma.customRole.findUnique({ where: { name: parsed.data.name } })
    if (existing) {
      return NextResponse.json({ error: 'Un ruolo con questo nome esiste già' }, { status: 409 })
    }

    const role = await prisma.customRole.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        color: parsed.data.color,
        baseRole: parsed.data.baseRole,
        modulePermissions: parsed.data.modulePermissions,
        sectionAccess: parsed.data.sectionAccess,
      },
    })

    return NextResponse.json({ data: role }, { status: 201 })
  } catch (error) {
    console.error('[api/roles POST]', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
