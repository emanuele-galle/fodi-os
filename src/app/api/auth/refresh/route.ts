import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken, createAccessToken, createRefreshToken } from '@/lib/auth'

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

    // If token is already revoked, possible theft - revoke ALL tokens for this user
    if (stored.isRevoked) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId },
        data: { isRevoked: true },
      })
      return NextResponse.json({ error: 'Token riutilizzato - sessioni invalidate' }, { status: 401 })
    }

    // Rotate: invalidate old token
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    })

    // Re-read user from DB to get current role/status (not stale JWT data)
    const user = await prisma.user.findUnique({
      where: { id: stored.userId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
    })

    if (!user || !user.isActive) {
      // User deactivated since token was issued - revoke all tokens
      await prisma.refreshToken.deleteMany({ where: { userId: stored.userId } })
      return NextResponse.json({ error: 'Account disattivato' }, { status: 401 })
    }

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
    }

    // Generate new access token with fresh DB data
    const accessToken = await createAccessToken(tokenPayload)

    // Generate new refresh token with fresh DB data
    const newRefreshTokenJwt = await createRefreshToken(tokenPayload)

    // Save new refresh token in DB
    await prisma.refreshToken.create({
      data: {
        token: newRefreshTokenJwt,
        userId: stored.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    cookieStore.set('fodi_access', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    })

    cookieStore.set('fodi_refresh', newRefreshTokenJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[auth/refresh]', error)
    return NextResponse.json({ error: 'Refresh token non valido' }, { status: 401 })
  }
}
