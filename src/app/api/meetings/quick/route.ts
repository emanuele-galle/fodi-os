import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, getCalendarService } from '@/lib/google'

// POST /api/meetings/quick - Create a quick 30-min meeting with Google Meet
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const auth = await getAuthenticatedClient(userId)
  if (!auth) {
    return NextResponse.json({ error: 'Google non connesso', connected: false }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const summary = body.summary || 'Quick Meet'

  const now = new Date()
  const end = new Date(now.getTime() + 30 * 60 * 1000)

  try {
    const calendar = getCalendarService(auth)
    const res = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary,
        start: { dateTime: now.toISOString(), timeZone: 'Europe/Rome' },
        end: { dateTime: end.toISOString(), timeZone: 'Europe/Rome' },
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    })

    const meetLink = res.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === 'video'
    )?.uri || null

    if (!meetLink) {
      return NextResponse.json({ error: 'Meet link non generato' }, { status: 500 })
    }

    return NextResponse.json({
      meetLink,
      eventId: res.data.id,
      summary: res.data.summary,
    }, { status: 201 })
  } catch (e) {
    console.error('Quick meet error:', e)
    return NextResponse.json({ error: 'Errore nella creazione del meeting' }, { status: 500 })
  }
}
