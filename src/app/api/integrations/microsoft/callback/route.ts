import { brand } from '@/lib/branding'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import {
  exchangeCodeForTokens,
  getMicrosoftUserEmail,
  getOrCreateTodoList,
  createWebhookSubscription,
} from '@/lib/microsoft-graph'
import { initialSyncToMicrosoftTodo } from '@/lib/microsoft-sync'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || brand.siteUrl
const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'FODI OS'
const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

function siteRedirect(path: string) {
  return NextResponse.redirect(new URL(path, SITE_URL))
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const stateToken = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return siteRedirect(`/settings?microsoft=error&reason=${error}`)
  }

  if (!code || !stateToken) {
    return siteRedirect('/settings?microsoft=error&reason=missing_params')
  }

  let userId: string
  try {
    const { payload } = await jwtVerify(stateToken, ACCESS_SECRET)
    if (payload.purpose !== 'microsoft_oauth' || !payload.sub) {
      return siteRedirect('/settings?microsoft=error&reason=invalid_state')
    }
    userId = payload.sub
  } catch {
    return siteRedirect('/settings?microsoft=error&reason=invalid_state')
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const email = await getMicrosoftUserEmail(tokens.access_token)

    await prisma.microsoftToken.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
        email,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
        email,
      },
    })

    // Create the To Do list automatically
    try {
      await getOrCreateTodoList(userId, BRAND_NAME)
    } catch (err) {
      console.error('[microsoft] Failed to create To Do list:', err)
    }

    // Setup webhook for real-time sync
    try {
      const token = await prisma.microsoftToken.findUnique({ where: { userId } })
      if (token?.todoListId) {
        const webhookUrl = `${SITE_URL}/api/integrations/microsoft/webhook`
        await createWebhookSubscription(userId, token.todoListId, webhookUrl)
      }
    } catch (err) {
      console.error('[microsoft] Failed to setup webhook:', err)
    }

    // Initial sync: push all existing tasks to Microsoft To Do (fire-and-forget)
    initialSyncToMicrosoftTodo(userId).catch((err) => {
      console.error('[microsoft] Initial sync failed:', err)
    })

    return siteRedirect('/settings?microsoft=connected')
  } catch (e) {
    console.error('Microsoft OAuth callback error:', e)
    return siteRedirect('/settings?microsoft=error&reason=token_exchange')
  }
}
