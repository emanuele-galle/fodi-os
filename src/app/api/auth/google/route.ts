import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getAuthUrl } from '@/lib/google'

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

// GET /api/auth/google - Redirect to Google consent screen
export async function GET(request: NextRequest) {
  // Read userId from middleware header OR from cookie directly
  // (this route is under /api/auth/ which is public, so middleware doesn't set headers)
  let userId = request.headers.get('x-user-id')

  if (!userId) {
    const token = request.cookies.get('fodi_access')?.value
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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://os.fodisrl.it'
    return NextResponse.redirect(new URL('/login', siteUrl))
  }

  const url = getAuthUrl(userId)
  return NextResponse.redirect(url)
}
