import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'
import { updateUserSchema } from '@/lib/validation'

const ADMIN_ROLES: Role[] = ['ADMIN', 'MANAGER']

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
  sectionAccess: true,
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const currentUserId = request.headers.get('x-user-id')!

    if (!ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ success: false, error: 'Permesso negato' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const parsed = updateUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Prevent self-deactivation
    if (id === currentUserId && data.isActive === false) {
      return NextResponse.json({ success: false, error: 'Non puoi disattivare te stesso' }, { status: 400 })
    }

    // Prevent self role-change
    if (id === currentUserId && data.role) {
      return NextResponse.json({ success: false, error: 'Non puoi modificare il tuo ruolo' }, { status: 400 })
    }

    // Managers cannot promote to ADMIN
    if (role === 'MANAGER' && data.role === 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Un Manager non puo\' assegnare il ruolo Admin' }, { status: 403 })
    }

    // Check if target user exists
    const existingUser = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
    if (!existingUser) {
      return NextResponse.json({ success: false, error: 'Utente non trovato' }, { status: 404 })
    }

    // Managers cannot edit admins
    if (role === 'MANAGER' && existingUser.role === 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Un Manager non puo\' modificare un Admin' }, { status: 403 })
    }

    // Check email uniqueness if changing
    if (data.email) {
      const emailTaken = await prisma.user.findFirst({
        where: { email: data.email, id: { not: id } },
        select: { id: true },
      })
      if (emailTaken) {
        return NextResponse.json({ success: false, error: 'Email gia\' in uso da un altro utente' }, { status: 409 })
      }
    }

    // Build update - only include provided fields
    const updateData: Record<string, unknown> = {}
    if (data.firstName !== undefined) updateData.firstName = data.firstName.trim()
    if (data.lastName !== undefined) updateData.lastName = data.lastName.trim()
    if (data.email !== undefined) updateData.email = data.email.trim()
    if (data.role !== undefined) updateData.role = data.role
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.phone !== undefined) updateData.phone = data.phone ? data.phone.trim() : null
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl || null
    if (data.sectionAccess !== undefined) updateData.sectionAccess = data.sectionAccess

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'Nessun campo da aggiornare' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_SELECT,
    })

    return NextResponse.json({ success: true, data: user, ...user })
  } catch (error) {
    console.error('[users/PATCH]', error)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
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
      return NextResponse.json({ success: false, error: 'Permesso negato' }, { status: 403 })
    }

    const { id } = await params

    if (id === currentUserId) {
      return NextResponse.json({ success: false, error: 'Non puoi eliminare te stesso' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
    if (!user) {
      return NextResponse.json({ success: false, error: 'Utente non trovato' }, { status: 404 })
    }

    // Managers cannot delete admins
    if (role === 'MANAGER' && user.role === 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Un Manager non puo\' eliminare un Admin' }, { status: 403 })
    }

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[users/DELETE]', error)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
