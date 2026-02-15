import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken, createAccessToken, createRefreshToken } from '@/lib/auth'

function buildUrl(request: NextRequest, path: string): URL {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  return new URL(path, `${proto}://${host}`)
}

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/dashboard'

  // Validate returnTo is a relative path (prevent open redirect)
  const safePath = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard'

  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('fodi_refresh')?.value

    if (!refreshToken) {
      return NextResponse.redirect(buildUrl(request, '/login'))
    }

    const payload = await verifyRefreshToken(refreshToken)

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    })

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } })
      }
      return NextResponse.redirect(buildUrl(request, '/login'))
    }

    // If token is already revoked, check if this is a concurrent refresh race condition.
    // Allow a 60s grace period where a recent valid token indicates normal race, not theft.
    if (stored.isRevoked) {
      const recentToken = await prisma.refreshToken.findFirst({
        where: { userId: stored.userId, isRevoked: false, expiresAt: { gt: new Date() }, createdAt: { gt: new Date(Date.now() - 60_000) } },
        orderBy: { createdAt: 'desc' },
      })
      if (recentToken) {
        // Race condition: another request already rotated. Use the new token.
        const user = await prisma.user.findUnique({
          where: { id: stored.userId },
          select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
        })
        if (user && user.isActive) {
          const accessToken = await createAccessToken({
            sub: user.id, email: user.email, name: `${user.firstName} ${user.lastName}`, role: user.role,
          })
          const response = NextResponse.redirect(buildUrl(request, safePath))
          response.cookies.set('fodi_access', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 30 * 60 })
          response.cookies.set('fodi_refresh', recentToken.token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 })
          return response
        }
      }
      // Outside grace period or no valid token: genuine reuse
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId },
        data: { isRevoked: true },
      })
      return NextResponse.redirect(buildUrl(request, '/login'))
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
      await prisma.refreshToken.deleteMany({ where: { userId: stored.userId } })
      return NextResponse.redirect(buildUrl(request, '/login'))
    }

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
    }

    // Generate new tokens with fresh DB data
    const accessToken = await createAccessToken(tokenPayload)

    const newRefreshTokenJwt = await createRefreshToken(tokenPayload)

    await prisma.refreshToken.create({
      data: {
        token: newRefreshTokenJwt,
        userId: stored.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const response = NextResponse.redirect(buildUrl(request, safePath))

    response.cookies.set('fodi_access', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 60,
    })

    response.cookies.set('fodi_refresh', newRefreshTokenJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error('[auth/refresh-redirect]', error)
    return NextResponse.redirect(buildUrl(request, '/login'))
  }
}
