import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role

    const isAdmin = role === 'ADMIN' || role === 'MANAGER'

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: isAdmin,
        role: true,
        isActive: true,
        avatarUrl: true,
        ...(isAdmin && { phone: true, lastLoginAt: true, createdAt: true }),
      },
      orderBy: { firstName: 'asc' },
    })

    return NextResponse.json({ users })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
