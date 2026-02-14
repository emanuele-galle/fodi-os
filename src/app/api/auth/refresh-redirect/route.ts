import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken, createAccessToken, createRefreshToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/dashboard'

  // Validate returnTo is a relative path (prevent open redirect)
  const safePath = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard'

  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('fodi_refresh')?.value

    if (!refreshToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const payload = await verifyRefreshToken(refreshToken)

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    })

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // If token is already revoked, possible theft - revoke ALL tokens for this user
    if (stored.isRevoked) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId },
        data: { isRevoked: true },
      })
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Rotate: invalidate old token
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    })

    // Generate new tokens
    const accessToken = await createAccessToken({
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    })

    const newRefreshTokenJwt = await createRefreshToken({
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    })

    await prisma.refreshToken.create({
      data: {
        token: newRefreshTokenJwt,
        userId: stored.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const response = NextResponse.redirect(new URL(safePath, request.url))

    response.cookies.set('fodi_access', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
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
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
