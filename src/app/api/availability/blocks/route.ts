import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAuthenticatedClient, getCalendarService } from '@/lib/google'
import { brand } from '@/lib/branding'

/**
 * GET /api/availability/blocks
 * Returns future block events (opaque, no attendees) from the user's Google Calendar.
 * Searches both primary and any brand-specific calendar.
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  try {
    const auth = await getAuthenticatedClient(session.sub)
    if (!auth) {
      return NextResponse.json({ error: 'Calendario non connesso' }, { status: 503 })
    }

    const calendar = getCalendarService(auth)
    const now = new Date()

    // Find all calendars to search (primary + any brand calendar)
    const calendarIds = ['primary']
    try {
      const calList = await calendar.calendarList.list()
      const brandCal = (calList.data.items || []).find((c) =>
        c.summary?.toLowerCase().includes(brand.slug)
      )
      if (brandCal?.id && brandCal.id !== 'primary') {
        calendarIds.push(brandCal.id)
      }
    } catch {
      // ignore - fallback to primary only
    }

    // Fetch events from all relevant calendars
    interface BlockEvent {
      id: string
      summary?: string | null
      start?: { dateTime?: string | null; date?: string | null } | null
      end?: { dateTime?: string | null; date?: string | null } | null
      recurringEventId?: string | null
      recurrence?: string[] | null
      _calendarId: string
    }
    const allEvents: BlockEvent[] = []
    const seen = new Set<string>()

    for (const calId of calendarIds) {
      const res = await calendar.events.list({
        calendarId: calId,
        timeMin: now.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 200,
      })

      for (const ev of res.data.items || []) {
        // Filter: only opaque events without attendees (= blocks)
        if (ev.transparency === 'transparent') continue
        if (ev.attendees && ev.attendees.length > 0) continue

        // Deduplicate across calendars
        if (ev.id && seen.has(ev.id)) continue
        if (ev.id) seen.add(ev.id)

        allEvents.push({
          id: ev.id!,
          summary: ev.summary,
          start: ev.start,
          end: ev.end,
          recurringEventId: ev.recurringEventId,
          recurrence: ev.recurrence,
          _calendarId: calId,
        })
      }
    }

    return NextResponse.json({ events: allEvents })
  } catch (error) {
    console.error('GET /api/availability/blocks error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
