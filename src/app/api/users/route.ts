import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const isAdmin = role === 'ADMIN' || role === 'MANAGER'

    // Admins see all users (including inactive), others see only active
    const users = await prisma.user.findMany({
      where: isAdmin ? {} : { isActive: true },
      select: {
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
      },
      orderBy: [{ isActive: 'desc' }, { firstName: 'asc' }],
    })

    return NextResponse.json({ users })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
