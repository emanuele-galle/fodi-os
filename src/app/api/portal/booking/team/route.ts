import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

/**
 * Returns team members who have Google Calendar connected
 * and booking enabled on their digital card.
 * Requires portal authentication.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  try {
    const members = await prisma.user.findMany({
      where: {
        isActive: true,
        googleToken: { isNot: null },
        digitalCard: {
          isEnabled: true,
          showBooking: true,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        jobTitle: true,
      },
      orderBy: { firstName: 'asc' },
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error('GET /api/portal/booking/team error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
