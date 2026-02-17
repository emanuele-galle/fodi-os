import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedClient, getCalendarService } from '@/lib/google'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params

  // Rate limit: 20 req/IP/min
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!rateLimit(`availability:${ip}`, 20, 60000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const card = await prisma.digitalCard.findUnique({
      where: { slug },
      select: {
        showBooking: true,
        bookingDuration: true,
        bookingDaysAhead: true,
        bookingStartHour: true,
        bookingEndHour: true,
        userId: true,
        user: {
          select: {
            timezone: true,
            googleToken: { select: { id: true } },
          }
        }
      }
    })

    if (!card || !card.showBooking || !card.user.googleToken) {
      return NextResponse.json({ error: 'Booking not available' }, { status: 404 })
    }

    const auth = await getAuthenticatedClient(card.userId)
    if (!auth) {
      return NextResponse.json({ error: 'Calendar not connected' }, { status: 503 })
    }

    const calendar = getCalendarService(auth)
    const timezone = card.user.timezone || 'Europe/Rome'

    // Calculate date range
    const now = new Date()
    // Buffer: skip slots within the next 2 hours
    const bufferMs = 2 * 60 * 60 * 1000
    const minTime = new Date(now.getTime() + bufferMs)
    const maxDate = new Date(now)
    maxDate.setDate(maxDate.getDate() + card.bookingDaysAhead)
    maxDate.setHours(23, 59, 59, 999)

    // Get busy times from Google Calendar
    const freebusyRes = await calendar.freebusy.query({
      requestBody: {
        timeMin: minTime.toISOString(),
        timeMax: maxDate.toISOString(),
        timeZone: timezone,
        items: [{ id: 'primary' }],
      }
    })

    const busyPeriods = freebusyRes.data.calendars?.primary?.busy || []

    // Generate available slots
    const slots: Record<string, string[]> = {}
    const durationMs = card.bookingDuration * 60 * 1000

    for (let d = 0; d <= card.bookingDaysAhead; d++) {
      const date = new Date(now)
      date.setDate(date.getDate() + d)

      // Skip weekends
      const dayOfWeek = date.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) continue

      const dateStr = date.toLocaleDateString('en-CA') // YYYY-MM-DD

      const daySlots: string[] = []

      for (let hour = card.bookingStartHour; hour < card.bookingEndHour; hour++) {
        for (let min = 0; min < 60; min += card.bookingDuration) {
          const slotStart = new Date(date)
          slotStart.setHours(hour, min, 0, 0)
          const slotEnd = new Date(slotStart.getTime() + durationMs)

          // Skip if slot is in the past (including buffer)
          if (slotStart < minTime) continue

          // Skip if slot extends past working hours
          const endCheck = new Date(date)
          endCheck.setHours(card.bookingEndHour, 0, 0, 0)
          if (slotEnd > endCheck) continue

          // Check against busy periods
          const isBusy = busyPeriods.some(busy => {
            const busyStart = new Date(busy.start!)
            const busyEnd = new Date(busy.end!)
            return slotStart < busyEnd && slotEnd > busyStart
          })

          if (!isBusy) {
            daySlots.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
          }
        }
      }

      if (daySlots.length > 0) {
        slots[dateStr] = daySlots
      }
    }

    return NextResponse.json({
      slots,
      duration: card.bookingDuration,
      timezone,
    })
  } catch (error) {
    console.error('GET /api/c/[slug]/availability error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
