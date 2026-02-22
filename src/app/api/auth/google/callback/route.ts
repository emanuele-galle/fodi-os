import { brand } from '@/lib/branding'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { createOAuth2Client, hasRequiredScopes } from '@/lib/google'
import { prisma } from '@/lib/prisma'
import { google } from 'googleapis'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || brand.siteUrl
const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

function siteRedirect(path: string) {
  return NextResponse.redirect(new URL(path, SITE_URL))
}

// GET /api/auth/google/callback - Handle OAuth2 callback
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const stateToken = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return siteRedirect(`/settings?google=error&reason=${error}`)
  }

  if (!code || !stateToken) {
    return siteRedirect('/settings?google=error&reason=missing_params')
  }

  // Verify state token to prevent CSRF/forgery
  let state: string
  try {
    const { payload } = await jwtVerify(stateToken, ACCESS_SECRET)
    if (payload.purpose !== 'google_oauth' || !payload.sub) {
      return siteRedirect('/settings?google=error&reason=invalid_state')
    }
    state = payload.sub
  } catch {
    return siteRedirect('/settings?google=error&reason=invalid_state')
  }

  try {
    const client = createOAuth2Client()
    const { tokens } = await client.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      return siteRedirect('/settings?google=error&reason=no_tokens')
    }

    // Check if user granted all required scopes (calendar)
    if (!hasRequiredScopes(tokens.scope)) {
      return siteRedirect('/settings?google=error&reason=insufficient_scopes')
    }

    // Get user email from Google
    client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: client })
    const { data: userInfo } = await oauth2.userinfo.get()

    // Upsert token in DB
    await prisma.googleToken.upsert({
      where: { userId: state },
      create: {
        userId: state,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
        scope: tokens.scope || '',
        email: userInfo.email || null,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
        scope: tokens.scope || '',
        email: userInfo.email || null,
      },
    })

    return siteRedirect('/settings?google=connected')
  } catch (e) {
    console.error('Google OAuth callback error:', e)
    return siteRedirect('/settings?google=error&reason=token_exchange')
  }
}
