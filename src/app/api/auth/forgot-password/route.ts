import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

const forgotPasswordSchema = z.object({
  email: z.string().email('Email non valida'),
})

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (!rateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Troppi tentativi. Riprova tra 15 minuti.' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = forgotPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (user) {
      // TODO: invio email reset via N8N webhook
      console.log(`[forgot-password] Reset richiesto per: ${email} (user: ${user.id})`)
    } else {
      console.log(`[forgot-password] Reset richiesto per email non esistente: ${email}`)
    }

    // Risposta sempre uguale per non rivelare se l'email esiste
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
