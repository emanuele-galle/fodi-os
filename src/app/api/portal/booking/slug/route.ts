import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalClient, handlePortalError } from '@/lib/portal-auth'

/**
 * Returns the digital card slug for a given userId.
 * Used by the portal BookingWidget to call the existing /api/c/[slug]/book endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    await requirePortalClient(request)

  const userId = new URL(request.url).searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId richiesto' }, { status: 400 })
  }

    const card = await prisma.digitalCard.findUnique({
      where: { userId },
      select: { slug: true },
    })

    if (!card) {
      return NextResponse.json({ error: 'Card non trovata' }, { status: 404 })
    }

    return NextResponse.json({ slug: card.slug })
  } catch (e) {
    return handlePortalError(e, 'portal/booking/slug')
  }
}
