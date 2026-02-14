import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forgotPasswordSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import { triggerWebhook } from '@/lib/n8n-webhook'
import { SignJWT } from 'jose'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (!rateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: 'Troppi tentativi. Riprova tra 15 minuti.' }, { status: 429 })
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

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fodi-os.fodivps2.cloud'
      const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`

      await triggerWebhook('/password-reset', {
        email,
        firstName: user.firstName,
        lastName: user.lastName,
        resetUrl,
        expiresIn: '1 ora',
      })
    }

    // Risposta sempre uguale per non rivelare se l'email esiste
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[auth/forgot-password]', error)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
