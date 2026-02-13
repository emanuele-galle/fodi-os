import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'
import type { Role } from '@/generated/prisma/client'

const ADMIN_ROLES: Role[] = ['ADMIN', 'MANAGER']
const VALID_ROLES: Role[] = ['ADMIN', 'MANAGER', 'SALES', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT', 'CLIENT']

const inviteUserSchema = z.object({
  email: z.string().email('Email non valida').max(255),
  firstName: z.string().min(1, 'Nome obbligatorio').max(100),
  lastName: z.string().min(1, 'Cognome obbligatorio').max(100),
  userRole: z.enum(['ADMIN', 'MANAGER', 'SALES', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT', 'CLIENT']).optional(),
  phone: z.string().max(30).optional().nullable(),
})

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role

    if (!ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = inviteUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email, firstName, lastName, userRole, phone } = parsed.data
    const assignedRole: Role = userRole && VALID_ROLES.includes(userRole) ? userRole : 'DEVELOPER'

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Un utente con questa email esiste gia' }, { status: 409 })
    }

    const tempPassword = generateTempPassword()
    const hashedPassword = await hashPassword(tempPassword)

    const user = await prisma.user.create({
      data: {
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
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user, tempPassword }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
