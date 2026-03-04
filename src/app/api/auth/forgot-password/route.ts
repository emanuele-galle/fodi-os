import { brand } from '@/lib/branding'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forgotPasswordSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import { sendViaSMTP } from '@/lib/email'
import { buildPasswordResetEmail } from '@/lib/email-templates'
import { SignJWT } from 'jose'
import { getClientIp } from '@/lib/ip'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rl = rateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Troppi tentativi. Riprova tra 15 minuti.' },
        { status: 429, headers: { 'X-RateLimit-Limit': '5', 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': String(rl.resetAt), 'Retry-After': String(Math.max(0, rl.resetAt - Math.floor(Date.now() / 1000))) } },
      )
    }

    const body = await request.json()
    const parsed = forgotPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email } = parsed.data

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true, lastName: true },
    })
    if (user) {
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is required')
      }
      const secret = new TextEncoder().encode(process.env.JWT_SECRET)
      const resetToken = await new SignJWT({ userId: user.id, purpose: 'password-reset' })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .setIssuedAt()
        .sign(secret)

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || brand.siteUrl
      const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`

      const html = buildPasswordResetEmail({ firstName: user.firstName, resetUrl })
      await sendViaSMTP(email, `Reset password - ${brand.name}`, html)
    }

    // Risposta sempre uguale per non rivelare se l'email esiste
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[auth/forgot-password]', error)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
