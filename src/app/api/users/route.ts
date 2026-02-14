import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const isAdmin = role === 'ADMIN' || role === 'MANAGER'

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
        sectionAccess: true,
      },
      orderBy: [{ isActive: 'desc' }, { firstName: 'asc' }],
    })

    return NextResponse.json({ success: true, data: users, items: users, users, total: users.length })
  } catch (error) {
    console.error('[users/GET]', error)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
