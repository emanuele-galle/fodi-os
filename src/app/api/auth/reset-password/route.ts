import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'
import { hashPassword } from '@/lib/auth'
import { passwordSchema } from '@/lib/validation/auth'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/ip'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rl = rateLimit(`reset-password:${ip}`, 5, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Troppi tentativi. Riprova tra 15 minuti.' },
        { status: 429 },
      )
    }

    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json({ error: 'Token e password obbligatori' }, { status: 400 })
    }

    const passwordValidation = passwordSchema.safeParse(password)
    if (!passwordValidation.success) {
      return NextResponse.json({ error: passwordValidation.error.issues[0].message }, { status: 400 })
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required')
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET)

    let payload: { userId?: string; purpose?: string }
    try {
      const result = await jwtVerify(token, secret)
      payload = result.payload as { userId?: string; purpose?: string }
    } catch {
      return NextResponse.json({ error: 'Link scaduto o non valido. Richiedi un nuovo reset.' }, { status: 400 })
    }

    if (payload.purpose !== 'password-reset' || !payload.userId) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    const hash = await hashPassword(password)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hash },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: user.id },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[auth/reset-password]', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
