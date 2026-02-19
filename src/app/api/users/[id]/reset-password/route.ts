import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateTempPassword } from '@/lib/auth'
import { ADMIN_ROLES } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'
import { logActivity } from '@/lib/activity-log'

export async function POST(
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
      return NextResponse.json({ error: 'Usa la pagina profilo per cambiare la tua password' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    // Managers cannot reset admin passwords
    if (role === 'MANAGER' && user.role === 'ADMIN') {
      return NextResponse.json({ error: 'Un Manager non puo\' resettare la password di un Admin' }, { status: 403 })
    }

    const tempPassword = generateTempPassword()
    const hashedPassword = await hashPassword(tempPassword)

    // Update password and invalidate all existing sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { password: hashedPassword },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: id },
      }),
    ])

    logActivity({
      userId: currentUserId,
      action: 'password_reset',
      entityType: 'user',
      entityId: id,
    })

    return NextResponse.json({ success: true, data: { tempPassword }, tempPassword })
  } catch (error) {
    console.error('[users/reset-password]', error)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
