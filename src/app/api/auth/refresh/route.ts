import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken, createAccessToken } from '@/lib/auth'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('fodi_refresh')?.value

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token mancante' }, { status: 401 })
    }

    const payload = await verifyRefreshToken(refreshToken)

    // Verify token exists in DB
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    })

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } })
      }
      return NextResponse.json({ error: 'Refresh token scaduto' }, { status: 401 })
    }

    // Generate new access token
    const accessToken = await createAccessToken({
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    })

    cookieStore.set('fodi_access', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[auth/refresh]', error)
    return NextResponse.json({ error: 'Refresh token non valido' }, { status: 401 })
  }
}
