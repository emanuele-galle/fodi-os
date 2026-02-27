import { brand } from '@/lib/branding'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'
import { getMicrosoftAuthUrl, isMicrosoftConfigured } from '@/lib/microsoft-graph'

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function GET(request: NextRequest) {
  if (!isMicrosoftConfigured()) {
    return NextResponse.json({ error: 'Microsoft integration not configured' }, { status: 503 })
  }

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

  const stateToken = await new SignJWT({ sub: userId, purpose: 'microsoft_oauth' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('10m')
    .sign(ACCESS_SECRET)

  const url = getMicrosoftAuthUrl(stateToken)
  return NextResponse.redirect(url)
}
