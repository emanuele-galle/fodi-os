import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalClient, handlePortalError } from '@/lib/portal-auth'

/**
 * Returns team members who have Google Calendar connected
 * and booking enabled on their digital card.
 * Requires portal authentication.
 */
export async function GET(request: NextRequest) {
  try {
    await requirePortalClient(request)
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
  } catch (e) {
    return handlePortalError(e, 'portal/booking/team')
  }
}
