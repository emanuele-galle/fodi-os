import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { getAuthenticatedClient, getCalendarService } from '@/lib/google'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

const blockSchema = z.object({
  userId: z.string().min(1),
  start: z.string().datetime(),
  end: z.string().datetime(),
  title: z.string().max(200).optional(),
  recurrence: z.array(z.string()).optional(),
})

/**
 * Block a time slot on Google Calendar.
 * Creates an opaque event so FreeBusy shows it as busy.
 * Requires ADMIN or staff role.
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  // Only staff/admin can block slots
  const allowedRoles = ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'PM']
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: 'Permessi insufficienti' }, { status: 403 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!rateLimit(`block-slot:${ip}`, 10, 60000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const data = blockSchema.parse(body)

    // Verify the user has Google Calendar connected
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: {
        timezone: true,
        googleToken: { select: { id: true } },
      },
    })

    if (!user || !user.googleToken) {
      return NextResponse.json({ error: 'Calendario non connesso' }, { status: 404 })
    }

    const auth = await getAuthenticatedClient(data.userId)
    if (!auth) {
      return NextResponse.json({ error: 'Calendario non disponibile' }, { status: 503 })
    }

    const calendar = getCalendarService(auth)
    const timezone = user.timezone || 'Europe/Rome'

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: data.title || 'Non disponibile',
        transparency: 'opaque',
        start: {
          dateTime: data.start,
          timeZone: timezone,
        },
        end: {
          dateTime: data.end,
          timeZone: timezone,
        },
        ...(data.recurrence && { recurrence: data.recurrence }),
      },
    })

    return NextResponse.json({
      success: true,
      eventId: event.data.id,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dati non validi', details: error.issues }, { status: 400 })
    }
    console.error('POST /api/availability/block error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
