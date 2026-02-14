import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { clearAuthCookies } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('fodi_refresh')?.value

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      })
    }

    // Close active work session on logout
    const userId = request.headers.get('x-user-id')
    if (userId) {
      const activeSession = await prisma.workSession.findFirst({
        where: { userId, clockOut: null },
        orderBy: { clockIn: 'desc' },
      })
      if (activeSession) {
        const now = new Date()
        const durationMins = Math.round(
          (now.getTime() - new Date(activeSession.clockIn).getTime()) / 60000
        )
        await prisma.workSession.update({
          where: { id: activeSession.id },
          data: { clockOut: now, durationMins },
        })
      }
    }

    await clearAuthCookies()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[auth/logout]', error)
    return NextResponse.json({ success: true })
  }
}
