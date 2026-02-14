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

    // If token is already revoked, check if this is a race condition (concurrent refresh requests).
    // Multiple browser tabs or simultaneous API calls can race to refresh the same token.
    // Instead of revoking ALL tokens (which causes unexpected logout), allow a 60s grace window.
    if (stored.isRevoked) {
      // Check if a newer token was created recently (within 60s) - indicates concurrent rotation
      const recentToken = await prisma.refreshToken.findFirst({
        where: { userId: stored.userId, isRevoked: false, expiresAt: { gt: new Date() }, createdAt: { gt: new Date(Date.now() - 60_000) } },
        orderBy: { createdAt: 'desc' },
      })
      if (recentToken) {
        // Within grace period: find the newest valid token for this user and use it
        const latestToken = await prisma.refreshToken.findFirst({
          where: { userId: stored.userId, isRevoked: false, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
        })
        if (latestToken) {
          // Another concurrent request already rotated; re-read user and issue new access token only
          const user = await prisma.user.findUnique({
            where: { id: stored.userId },
            select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
          })
          if (user && user.isActive) {
            const accessToken = await createAccessToken({
              sub: user.id, email: user.email, name: `${user.firstName} ${user.lastName}`, role: user.role,
            })
            cookieStore.set('fodi_access', accessToken, {
              httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 30 * 60,
            })
            // Also set the latest refresh token cookie so next refresh uses the right one
            cookieStore.set('fodi_refresh', latestToken.token, {
              httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60,
            })
            return NextResponse.json({ success: true })
          }
        }
      }
      // Outside grace period or no valid token found: genuine reuse, revoke all
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId },
        data: { isRevoked: true },
      })
      return NextResponse.json({ error: 'Token riutilizzato - sessioni invalidate' }, { status: 401 })
    }

    // Rotate: invalidate old token and cleanup old revoked/expired tokens
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: stored.id },
        data: { isRevoked: true },
      }),
      prisma.refreshToken.deleteMany({
        where: {
          userId: stored.userId,
          OR: [
            { isRevoked: true, id: { not: stored.id } },
            { expiresAt: { lt: new Date() } },
          ],
        },
      }),
    ])

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
      maxAge: 30 * 60,
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
