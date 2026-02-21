import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ADMIN_ROLES } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const isAdmin = ADMIN_ROLES.includes(role)

    const users = await prisma.user.findMany({
      where: isAdmin ? {} : { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: isAdmin,
        role: true,
        customRoleId: isAdmin,
        customRole: isAdmin ? { select: { id: true, name: true, color: true } } : false,
        isActive: true,
        avatarUrl: true,
        phone: isAdmin,
        lastLoginAt: isAdmin,
        createdAt: isAdmin,
        sectionAccess: isAdmin,
      },
      orderBy: [{ isActive: 'desc' }, { firstName: 'asc' }],
    })

    return NextResponse.json({ success: true, data: users, items: users, users, total: users.length })
  } catch (error) {
    console.error('[users/GET]', error)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
