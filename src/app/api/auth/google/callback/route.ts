import { NextRequest, NextResponse } from 'next/server'
import { createOAuth2Client } from '@/lib/google'
import { prisma } from '@/lib/prisma'
import { google } from 'googleapis'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://os.fodisrl.it'

function siteRedirect(path: string) {
  return NextResponse.redirect(new URL(path, SITE_URL))
}

// GET /api/auth/google/callback - Handle OAuth2 callback
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state') // userId
  const error = searchParams.get('error')

  if (error) {
    return siteRedirect(`/settings?google=error&reason=${error}`)
  }

  if (!code || !state) {
    return siteRedirect('/settings?google=error&reason=missing_params')
  }

  try {
    const client = createOAuth2Client()
    const { tokens } = await client.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      return siteRedirect('/settings?google=error&reason=no_tokens')
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
