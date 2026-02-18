import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateTempPassword } from '@/lib/auth'
import { inviteUserSchema } from '@/lib/validation'
import { ADMIN_ROLES } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role

    if (!ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ success: false, error: 'Permesso negato' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = inviteUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email, firstName, lastName, userRole, phone } = parsed.data
    const assignedRole: Role = userRole || 'DEVELOPER'

    // Managers cannot create Admin users
    if (role === 'MANAGER' && assignedRole === 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Un Manager non puo creare utenti Admin' }, { status: 403 })
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Un utente con questa email esiste gia' }, { status: 409 })
    }

    // Generate username from firstName (lowercase, no spaces)
    let baseUsername = firstName.toLowerCase().replace(/[^a-z0-9]/g, '')
    let username = baseUsername
    let suffix = 1
    while (await prisma.user.findUnique({ where: { username }, select: { id: true } })) {
      username = `${baseUsername}${suffix}`
      suffix++
    }

    const tempPassword = generateTempPassword()
    const hashedPassword = await hashPassword(tempPassword)

    const user = await prisma.user.create({
      data: {
        username,
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role: assignedRole,
        isActive: true,
        ...(phone && { phone: phone.trim() }),
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: { user, tempPassword }, user, tempPassword }, { status: 201 })
  } catch (error) {
    console.error('[users/invite]', error)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
