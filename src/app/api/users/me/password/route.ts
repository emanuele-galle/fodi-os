import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { rateLimit } from '@/lib/rate-limit'
import { passwordSchema } from '@/lib/validation/auth'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!

    if (!rateLimit(`password:${userId}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Troppi tentativi. Riprova tra 15 minuti.' }, { status: 429 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Password attuale e nuova obbligatorie' }, { status: 400 })
    }

    const passwordValidation = passwordSchema.safeParse(newPassword)
    if (!passwordValidation.success) {
      return NextResponse.json({ error: passwordValidation.error.issues[0].message }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Password attuale non corretta' }, { status: 400 })
    }

    const hash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[users/me/password]', error)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
