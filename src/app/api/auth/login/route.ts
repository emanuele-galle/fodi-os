import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, createAccessToken, createRefreshToken, setAuthCookies } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import { logActivity } from '@/lib/activity-log'
import { getClientIp } from '@/lib/ip'

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return process.env.NODE_ENV === 'development'

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  })

  const data = await res.json()
  return data.success === true
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)

    const rl = rateLimit(`login:${ip}`, 5, 60000)
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Troppi tentativi. Riprova tra un minuto.' },
        { status: 429, headers: { 'X-RateLimit-Limit': '5', 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': String(rl.resetAt), 'Retry-After': String(Math.max(0, rl.resetAt - Math.floor(Date.now() / 1000))) } },
      )
    }

    const body = await request.json()

    // Verify Turnstile token (mandatory when TURNSTILE_SECRET_KEY is configured)
    const turnstileToken = body.turnstileToken
    if (process.env.TURNSTILE_SECRET_KEY) {
      if (!turnstileToken) {
        return NextResponse.json({ success: false, error: 'Token di sicurezza mancante. Ricarica la pagina.' }, { status: 403 })
      }
      const turnstileValid = await verifyTurnstile(turnstileToken, ip)
      if (!turnstileValid) {
        return NextResponse.json({ success: false, error: 'Verifica di sicurezza fallita. Ricarica la pagina.' }, { status: 403 })
      }
    }

    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { username, password } = parsed.data
    const credential = username.toLowerCase().trim()

    // Rate limit per credential to prevent IP-rotation brute-force
    const credRl = rateLimit(`login-cred:${credential}`, 10, 300000) // 10 attempts per 5 min per account
    if (!credRl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Troppi tentativi per questo account. Riprova tra qualche minuto.' },
        { status: 429 },
      )
    }
    const isEmail = credential.includes('@')

    const user = await prisma.user.findUnique({
      where: isEmail ? { email: credential } : { username: credential },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        customRoleId: true,
        password: true,
        isActive: true,
      },
    })
    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, error: 'Credenziali non valide' }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.password!)
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Credenziali non valide' }, { status: 401 })
    }

    const clientIp = ip !== 'unknown' ? ip : ''

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      customRoleId: user.customRoleId,
    }

    const [accessToken, refreshToken] = await Promise.all([
      createAccessToken(tokenPayload),
      createRefreshToken(tokenPayload),
    ])

    // Save refresh token in DB
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    })

    // Update last login + IP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        ...(clientIp && { lastIpAddress: clientIp }),
      },
    })

    await setAuthCookies(accessToken, refreshToken)

    logActivity({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'AUTH',
      entityId: user.id,
      metadata: { ip: clientIp || 'unknown', userAgent: request.headers.get('user-agent')?.substring(0, 200) || null },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('[auth/login]', error)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
