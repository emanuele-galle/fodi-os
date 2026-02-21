import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

/**
 * Returns the digital card slug for a given userId.
 * Used by the portal BookingWidget to call the existing /api/c/[slug]/book endpoint.
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  const userId = new URL(request.url).searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId richiesto' }, { status: 400 })
  }

  try {
    const card = await prisma.digitalCard.findUnique({
      where: { userId },
      select: { slug: true },
    })

    if (!card) {
      return NextResponse.json({ error: 'Card non trovata' }, { status: 404 })
    }

    return NextResponse.json({ slug: card.slug })
  } catch (error) {
    console.error('GET /api/portal/booking/slug error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
