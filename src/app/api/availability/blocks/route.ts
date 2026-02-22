import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAuthenticatedClient, getCalendarService } from '@/lib/google'

/**
 * GET /api/availability/blocks
 * Returns future "Non disponibile" / opaque events from the user's Google Calendar.
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

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      q: 'Non disponibile',
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    })

    const events = (res.data.items || []).map((ev) => ({
      id: ev.id,
      summary: ev.summary,
      start: ev.start,
      end: ev.end,
      recurringEventId: ev.recurringEventId,
      recurrence: ev.recurrence,
    }))

    return NextResponse.json({ events })
  } catch (error) {
    console.error('GET /api/availability/blocks error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
