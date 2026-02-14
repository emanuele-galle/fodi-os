import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const isImpersonating = request.headers.get('x-impersonating') === 'true'
    const realAdminId = request.headers.get('x-real-admin-id')
    const impersonateId = request.cookies.get('fodi_impersonate')?.value

    // If impersonating, fetch the target user instead
    const targetUserId = (isImpersonating && impersonateId) ? impersonateId : session.sub

    const userSelect = {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      avatarUrl: true,
      sectionAccess: true,
      bio: true,
      timezone: true,
      language: true,
      phone: true,
      createdAt: true,
      lastLoginAt: true,
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: userSelect,
    })

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Add impersonation info
    if (isImpersonating && realAdminId) {
      const admin = await prisma.user.findUnique({
        where: { id: realAdminId },
        select: { id: true, firstName: true, lastName: true },
      })

      return NextResponse.json({
        user: {
          ...user,
          isImpersonating: true,
          realAdmin: admin ? { id: admin.id, name: `${admin.firstName} ${admin.lastName}` } : null,
        },
      })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('[auth/session]', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
