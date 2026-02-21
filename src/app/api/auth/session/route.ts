import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Check impersonation directly from cookie + JWT role (no middleware headers needed)
    const impersonateId = request.cookies.get('fodi_impersonate')?.value
    const isImpersonating = !!(impersonateId && session.role === 'ADMIN' && impersonateId !== session.sub)

    const targetUserId = isImpersonating ? impersonateId : session.sub

    const userSelect = {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      customRoleId: true,
      customRole: {
        select: { id: true, name: true, color: true, modulePermissions: true, sectionAccess: true, baseRole: true },
      },
      avatarUrl: true,
      sectionAccess: true,
      bio: true,
      timezone: true,
      language: true,
      phone: true,
      createdAt: true,
      lastLoginAt: true,
      dailyDigest: true,
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: userSelect,
    })

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Add impersonation info
    if (isImpersonating) {
      return NextResponse.json({
        user: {
          ...user,
          isImpersonating: true,
          realAdmin: { id: session.sub, name: session.name },
        },
      })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('[auth/session]', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
