import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/ip'

const leadSchema = z.object({
  name: z.string().min(1, 'Nome richiesto'),
  email: z.string().email('Email non valida'),
  message: z.string().min(1, 'Messaggio richiesto'),
  company: z.string().optional(),
  phone: z.string().optional(),
  service: z.string().optional(),
  source: z.string().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Rate limit: 5 submissions per IP per minuto
    const ip = getClientIp(request)

    const rateLimitKey = `lead:${ip}`
    const allowed = rateLimit(rateLimitKey, 5, 60000) // 1 minute

    if (!allowed) {
      return NextResponse.json(
        { error: 'Troppe richieste. Riprova tra qualche minuto.' },
        { status: 429 }
      )
    }

    const card = await prisma.digitalCard.findUnique({
      where: { slug }
    })

    if (!card || !card.isEnabled) {
      return NextResponse.json(
        { error: 'Card non trovata' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validated = leadSchema.parse(body)

    // Create lead with source tracking
    const lead = await prisma.lead.create({
      data: {
        name: validated.name,
        email: validated.email,
        message: validated.message,
        company: validated.company,
        phone: validated.phone,
        service: validated.service,
        source: `nfc-card:${slug}`,
        status: 'NEW'
      }
    })

    return NextResponse.json({
      success: true,
      data: { id: lead.id }
    })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dati non validi', details: e.issues },
        { status: 400 }
      )
    }

    console.error('[lead/POST]', e)
    return NextResponse.json(
      { error: 'Errore interno' },
      { status: 500 }
    )
  }
}
