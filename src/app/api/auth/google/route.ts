import { brand } from '@/lib/branding'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'
import { getAuthUrl } from '@/lib/google'

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

// GET /api/auth/google - Redirect to Google consent screen
export async function GET(request: NextRequest) {
  // Read userId from middleware header OR from cookie directly
  // (this route is under /api/auth/ which is public, so middleware doesn't set headers)
  let userId = request.headers.get('x-user-id')

  if (!userId) {
    const token = request.cookies.get(brand.cookies.access)?.value
    if (token) {
      try {
        const { payload } = await jwtVerify(token, ACCESS_SECRET)
        userId = payload.sub as string
      } catch {
        // invalid token
      }
    }
  }

  if (!userId) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || brand.siteUrl
    return NextResponse.redirect(new URL('/login', siteUrl))
  }

  // Sign state as JWT to prevent forgery in callback
  const stateToken = await new SignJWT({ sub: userId, purpose: 'google_oauth' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('10m')
    .sign(ACCESS_SECRET)

  const url = getAuthUrl(stateToken)
  return NextResponse.redirect(url)
}
