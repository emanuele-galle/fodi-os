import { brand } from '@/lib/branding'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { clearAuthCookies, getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'

export async function POST() {
  try {
    const session = await getSession()
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get(brand.cookies.refresh)?.value

    // Invalidate ALL refresh tokens for this user
    if (session) {
      await prisma.refreshToken.deleteMany({
        where: { userId: session.sub },
      })
    } else if (refreshToken) {
      // Fallback: if no session, delete by token
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      })
    }

    // Close active work session on logout
    if (session) {
      const activeWorkSession = await prisma.workSession.findFirst({
        where: { userId: session.sub, clockOut: null },
        orderBy: { clockIn: 'desc' },
      })
      if (activeWorkSession) {
        const now = new Date()
        const durationMins = Math.round(
          (now.getTime() - new Date(activeWorkSession.clockIn).getTime()) / 60000
        )
        await prisma.workSession.update({
          where: { id: activeWorkSession.id },
          data: { clockOut: now, durationMins },
        })
      }
    }

    if (session) {
      logActivity({ userId: session.sub, action: 'LOGOUT', entityType: 'AUTH', entityId: session.sub })
    }

    await clearAuthCookies()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[auth/logout]', error)
    await clearAuthCookies()
    return NextResponse.json({ success: true })
  }
}
