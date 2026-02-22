import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/ip'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Rate limit: 1 view per IP per 5 minuti
    const ip = getClientIp(request)

    const rateLimitKey = `card-view:${slug}:${ip}`
    const allowed = rateLimit(rateLimitKey, 1, 300000) // 5 minutes

    if (!allowed) {
      return NextResponse.json(
        { error: 'Troppe richieste' },
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

    // Increment view count
    await prisma.digitalCard.update({
      where: { id: card.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[view/POST]', e)
    return NextResponse.json(
      { error: 'Errore interno' },
      { status: 500 }
    )
  }
}
