import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

const ADMIN_ROLES: Role[] = ['ADMIN', 'MANAGER']
const VALID_ROLES: Role[] = ['ADMIN', 'MANAGER', 'SALES', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT', 'CLIENT']

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  isActive: true,
  avatarUrl: true,
  phone: true,
  lastLoginAt: true,
  createdAt: true,
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const currentUserId = request.headers.get('x-user-id')!

    if (!ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    // Prevent self-deactivation
    if (id === currentUserId && body.isActive === false) {
      return NextResponse.json({ error: 'Non puoi disattivare te stesso' }, { status: 400 })
    }

    // Prevent self role-change
    if (id === currentUserId && body.role) {
      return NextResponse.json({ error: 'Non puoi modificare il tuo ruolo' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}

    if (body.role && VALID_ROLES.includes(body.role)) {
      updateData.role = body.role
    }

    if (typeof body.isActive === 'boolean') {
      updateData.isActive = body.isActive
    }

    if (typeof body.firstName === 'string' && body.firstName.trim()) {
      updateData.firstName = body.firstName.trim()
    }

    if (typeof body.lastName === 'string' && body.lastName.trim()) {
      updateData.lastName = body.lastName.trim()
    }

    if (typeof body.email === 'string' && body.email.trim()) {
      // Check uniqueness if email is changing
      const existing = await prisma.user.findFirst({
        where: { email: body.email.trim(), id: { not: id } },
      })
      if (existing) {
        return NextResponse.json({ error: 'Email gia\' in uso da un altro utente' }, { status: 409 })
      }
      updateData.email = body.email.trim()
    }

    if (body.phone !== undefined) {
      updateData.phone = body.phone ? body.phone.trim() : null
    }

    if (body.avatarUrl !== undefined) {
      updateData.avatarUrl = body.avatarUrl || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_SELECT,
    })

    return NextResponse.json({ user })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const currentUserId = request.headers.get('x-user-id')!

    if (!ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

    const { id } = await params

    if (id === currentUserId) {
      return NextResponse.json({ error: 'Non puoi eliminare te stesso' }, { status: 400 })
    }

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    // Managers cannot delete admins
    if (role === 'MANAGER' && user.role === 'ADMIN') {
      return NextResponse.json({ error: 'Un Manager non puo\' eliminare un Admin' }, { status: 403 })
    }

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
