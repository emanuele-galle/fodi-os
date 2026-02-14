import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, getCalendarService } from '@/lib/google'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

// GET /api/meetings - List upcoming meetings with Google Meet links
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[meetings]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }

  const auth = await getAuthenticatedClient(userId)
  if (!auth) {
    return NextResponse.json({ error: 'Google non connesso', connected: false }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const maxResults = Math.min(50, parseInt(searchParams.get('maxResults') || '20'))

  try {
    const calendar = getCalendarService(auth)
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    })

    // Filter only events with Meet links
    const meetings = (res.data.items || [])
      .filter((event) =>
        event.conferenceData?.entryPoints?.some((ep) => ep.entryPointType === 'video')
      )
      .map((event) => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        meetLink: event.conferenceData?.entryPoints?.find(
          (ep) => ep.entryPointType === 'video'
        )?.uri,
        attendees: event.attendees?.map((a) => ({
          email: a.email,
          responseStatus: a.responseStatus,
        })),
        htmlLink: event.htmlLink,
      }))

    return NextResponse.json({ meetings })
  } catch (e) {
    console.error('Meetings list error:', e)
    return NextResponse.json({ error: 'Errore nel recupero meetings' }, { status: 500 })
  }
}
