import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { clearAuthCookies } from '@/lib/auth'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('fodi_refresh')?.value

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      })
    }

    await clearAuthCookies()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[auth/logout]', error)
    return NextResponse.json({ success: true })
  }
}
