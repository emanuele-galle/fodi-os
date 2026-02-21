import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedClient, getCalendarService } from '@/lib/google'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

/**
 * Internal authenticated endpoint for portal booking availability.
 * Similar to /api/c/[slug]/availability but uses userId directly
 * instead of requiring a DigitalCard.
 *
 * Query params:
 *   userId    - target user to check availability for (required)
 *   duration  - slot duration in minutes (default 30)
 *   daysAhead - how many days ahead to show (default 14)
 *   startHour - earliest slot hour (default 9)
 *   endHour   - latest slot hour (default 18)
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!rateLimit(`portal-avail:${ip}`, 30, 60000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId richiesto' }, { status: 400 })
  }

  const duration = parseInt(searchParams.get('duration') || '30', 10)
  const daysAhead = parseInt(searchParams.get('daysAhead') || '14', 10)
  const startHour = parseInt(searchParams.get('startHour') || '9', 10)
  const endHour = parseInt(searchParams.get('endHour') || '18', 10)

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        timezone: true,
        googleToken: { select: { id: true } },
      },
    })

    if (!user || !user.googleToken) {
      return NextResponse.json({ error: 'Calendario non disponibile' }, { status: 404 })
    }

    const auth = await getAuthenticatedClient(userId)
    if (!auth) {
      return NextResponse.json({ error: 'Calendario non connesso' }, { status: 503 })
    }

    const calendar = getCalendarService(auth)
    const timezone = user.timezone || 'Europe/Rome'

    const now = new Date()
    const bufferMs = 2 * 60 * 60 * 1000
    const minTime = new Date(now.getTime() + bufferMs)
    const maxDate = new Date(now)
    maxDate.setDate(maxDate.getDate() + daysAhead)
    maxDate.setHours(23, 59, 59, 999)

    const freebusyRes = await calendar.freebusy.query({
      requestBody: {
        timeMin: minTime.toISOString(),
        timeMax: maxDate.toISOString(),
        timeZone: timezone,
        items: [{ id: 'primary' }],
      },
    })

    const busyPeriods = freebusyRes.data.calendars?.primary?.busy || []

    const slots: Record<string, string[]> = {}
    const durationMs = duration * 60 * 1000

    for (let d = 0; d <= daysAhead; d++) {
      const date = new Date(now)
      date.setDate(date.getDate() + d)

      const dayOfWeek = date.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) continue

      const dateStr = date.toLocaleDateString('en-CA')
      const daySlots: string[] = []

      for (let hour = startHour; hour < endHour; hour++) {
        for (let min = 0; min < 60; min += duration) {
          const slotStart = new Date(date)
          slotStart.setHours(hour, min, 0, 0)
          const slotEnd = new Date(slotStart.getTime() + durationMs)

          if (slotStart < minTime) continue

          const endCheck = new Date(date)
          endCheck.setHours(endHour, 0, 0, 0)
          if (slotEnd > endCheck) continue

          const isBusy = busyPeriods.some((busy) => {
            const busyStart = new Date(busy.start!)
            const busyEnd = new Date(busy.end!)
            return slotStart < busyEnd && slotEnd > busyStart
          })

          if (!isBusy) {
            daySlots.push(
              `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
            )
          }
        }
      }

      if (daySlots.length > 0) {
        slots[dateStr] = daySlots
      }
    }

    return NextResponse.json({ slots, duration, timezone })
  } catch (error) {
    console.error('GET /api/availability error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
