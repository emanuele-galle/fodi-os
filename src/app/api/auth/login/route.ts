import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, createAccessToken, createRefreshToken, setAuthCookies } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import { logActivity } from '@/lib/activity-log'
import { generateOtpCode, maskEmail, sendLoginOtpEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'
import { getClientIp } from '@/lib/ip'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)

    if (!rateLimit(`login:${ip}`, 5, 60000)) {
      return NextResponse.json({ success: false, error: 'Troppi tentativi. Riprova tra un minuto.' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { username, password } = parsed.data

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
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

    // === IP VERIFICATION ===
    const clientIp = ip !== 'unknown' ? ip : ''
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev) {
      // clientIp might be empty — treat as untrusted
      const ipForLookup = clientIp || 'unknown'
      const trustedIp = clientIp
        ? await prisma.trustedIp.findUnique({
            where: { userId_ipAddress: { userId: user.id, ipAddress: clientIp } },
          })
        : null

      if (trustedIp) {
        // IP trusted - aggiorna lastUsedAt e continua con il login normale
        await prisma.trustedIp.update({
          where: { id: trustedIp.id },
          data: { lastUsedAt: new Date() },
        })
      } else {
        // IP NON trusted or unknown - genera OTP e richiedi verifica

        // Rate limit invio OTP: 3 per 10 min per userId
        if (!rateLimit(`otp-send:${user.id}`, 3, 10 * 60 * 1000)) {
          return NextResponse.json(
            { success: false, error: 'Troppi codici inviati. Riprova tra qualche minuto.' },
            { status: 429 }
          )
        }

        // Invalidare OTP precedenti non usati per questo user+IP
        await prisma.loginOtp.updateMany({
          where: { userId: user.id, ipAddress: ipForLookup, isUsed: false },
          data: { isUsed: true },
        })

        // Genera OTP
        const otpCode = generateOtpCode()
        const otpHash = await bcrypt.hash(otpCode, 10)
        const userAgent = request.headers.get('user-agent')?.substring(0, 500) || null

        await prisma.loginOtp.create({
          data: {
            userId: user.id,
            otpHash,
            ipAddress: ipForLookup,
            userAgent,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minuti
          },
        })

        // Invia email
        await sendLoginOtpEmail(user.email, otpCode, ipForLookup)

        logActivity({
          userId: user.id,
          action: 'LOGIN_OTP_SENT',
          entityType: 'AUTH',
          entityId: user.id,
          metadata: { ip: ipForLookup, reason: clientIp ? 'untrusted_ip' : 'unknown_ip' },
        })

        return NextResponse.json(
          {
            success: false,
            requiresIpVerification: true,
            userId: user.id,
            maskedEmail: maskEmail(user.email),
          },
          { status: 403 }
        )
      }
    }

    // === FLUSSO NORMALE: IP trusted o IP sconosciuto ===
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
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
