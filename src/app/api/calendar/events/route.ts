import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, getCalendarService } from '@/lib/google'

// GET /api/calendar/events - List Google Calendar events
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const auth = await getAuthenticatedClient(userId)
  if (!auth) {
    return NextResponse.json({ error: 'Google non connesso', connected: false }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const timeMin = searchParams.get('timeMin') || new Date().toISOString()
  const timeMax = searchParams.get('timeMax')
  const calendarId = searchParams.get('calendarId') || 'primary'
  const maxResults = Math.min(250, parseInt(searchParams.get('maxResults') || '100'))

  try {
    const calendar = getCalendarService(auth)
    const res = await calendar.events.list({
      calendarId,
      timeMin,
      ...(timeMax && { timeMax }),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    })

    return NextResponse.json({
      events: res.data.items || [],
      nextPageToken: res.data.nextPageToken,
      summary: res.data.summary,
    })
  } catch (e) {
    console.error('Calendar events error:', e)
    return NextResponse.json({ error: 'Errore nel recupero eventi' }, { status: 500 })
  }
}

// POST /api/calendar/events - Create a new calendar event
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const auth = await getAuthenticatedClient(userId)
  if (!auth) {
    return NextResponse.json({ error: 'Google non connesso', connected: false }, { status: 403 })
  }

  const body = await request.json()
  const { summary, description, start, end, location, attendees, calendarId, withMeet } = body

  if (!summary || !start || !end) {
    return NextResponse.json(
      { error: 'Campi obbligatori: summary, start, end' },
      { status: 400 }
    )
  }

  try {
    const calendar = getCalendarService(auth)
    const res = await calendar.events.insert({
      calendarId: calendarId || 'primary',
      ...(withMeet && { conferenceDataVersion: 1 }),
      requestBody: {
        summary,
        description,
        location,
        start: { dateTime: start, timeZone: 'Europe/Rome' },
        end: { dateTime: end, timeZone: 'Europe/Rome' },
        ...(attendees && {
          attendees: attendees.map((email: string) => ({ email })),
        }),
        ...(withMeet && {
          conferenceData: {
            createRequest: {
              requestId: crypto.randomUUID(),
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        }),
      },
    })

    const meetLink = res.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === 'video'
    )?.uri || null

    return NextResponse.json({ ...res.data, meetLink }, { status: 201 })
  } catch (e) {
    console.error('Calendar create error:', e)
    return NextResponse.json({ error: 'Errore nella creazione evento' }, { status: 500 })
  }
}
