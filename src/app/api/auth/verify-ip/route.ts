import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAccessToken, createRefreshToken, setAuthCookies } from '@/lib/auth'
import { verifyIpOtpSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import { logActivity } from '@/lib/activity-log'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    // Rate limit: 5 tentativi per 5 minuti per IP
    if (!rateLimit(`verify-ip:${ip}`, 5, 5 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: 'Troppi tentativi. Riprova tra qualche minuto.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = verifyIpOtpSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dati non validi', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { userId, otp } = parsed.data

    // Trova OTP non usato, non scaduto, per userId + IP
    const loginOtp = await prisma.loginOtp.findFirst({
      where: {
        userId,
        ipAddress: ip,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!loginOtp) {
      return NextResponse.json(
        { success: false, error: 'Codice scaduto o non valido. Effettua di nuovo il login.', expired: true },
        { status: 400 }
      )
    }

    // Max tentativi raggiunto
    if (loginOtp.attempts >= loginOtp.maxAttempts) {
      await prisma.loginOtp.update({
        where: { id: loginOtp.id },
        data: { isUsed: true },
      })
      return NextResponse.json(
        { success: false, error: 'Troppi tentativi errati. Effettua di nuovo il login.', expired: true },
        { status: 400 }
      )
    }

    // Verifica OTP con bcrypt
    const valid = await bcrypt.compare(otp, loginOtp.otpHash)

    if (!valid) {
      const newAttempts = loginOtp.attempts + 1
      await prisma.loginOtp.update({
        where: { id: loginOtp.id },
        data: { attempts: newAttempts },
      })
      const remaining = loginOtp.maxAttempts - newAttempts
      return NextResponse.json(
        { success: false, error: `Codice errato. ${remaining} tentativi rimasti.`, attemptsRemaining: remaining },
        { status: 400 }
      )
    }

    // OTP valido - marcare come usato
    await prisma.loginOtp.update({
      where: { id: loginOtp.id },
      data: { isUsed: true },
    })

    // Upsert IP come trusted
    const userAgent = request.headers.get('user-agent')?.substring(0, 500) || null
    await prisma.trustedIp.upsert({
      where: { userId_ipAddress: { userId, ipAddress: ip } },
      update: { lastUsedAt: new Date(), userAgent },
      create: { userId, ipAddress: ip, userAgent },
    })

    // Recupera dati utente per token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'Utente non trovato' }, { status: 404 })
    }

    // Crea token JWT (stesso flusso del login)
    const tokenPayload = {
      sub: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
    }

    const [accessToken, refreshToken] = await Promise.all([
      createAccessToken(tokenPayload),
      createRefreshToken(tokenPayload),
    ])

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    // Aggiorna last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastIpAddress: ip,
      },
    })

    await setAuthCookies(accessToken, refreshToken)

    logActivity({
      userId: user.id,
      action: 'LOGIN_IP_VERIFIED',
      entityType: 'AUTH',
      entityId: user.id,
      metadata: { ip, userAgent: userAgent?.substring(0, 200) || null },
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
    console.error('[auth/verify-ip]', error)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
