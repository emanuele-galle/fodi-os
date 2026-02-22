import { brand } from '@/lib/branding'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forgotPasswordSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rate-limit'
import { sendViaSMTP } from '@/lib/email'
import { SignJWT } from 'jose'
import { getClientIp } from '@/lib/ip'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
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

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || brand.siteUrl
      const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`

      await sendViaSMTP(email, `Reset password - ${brand.name}`, `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <h2 style="color: #1e293b; margin: 0 0 8px;">Reset Password</h2>
    <p style="color: #64748b; margin: 0 0 24px; font-size: 14px;">
      Ciao <strong>${user.firstName}</strong>, hai richiesto il reset della password del tuo account ${brand.name}.
    </p>
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${resetUrl}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        Reimposta Password
      </a>
    </div>
    <p style="color: #94a3b8; font-size: 12px; margin: 0 0 16px;">
      Il link scade tra <strong>1 ora</strong>. Se non hai richiesto il reset, ignora questa email.
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #94a3b8; font-size: 11px; margin: 0;">
      ${brand.email.footerText} - Sistema Gestionale<br/>
      Questa è un'email automatica, non rispondere.
    </p>
  </div>
</body>
</html>`)
    }

    // Risposta sempre uguale per non rivelare se l'email esiste
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[auth/forgot-password]', error)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
