import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, getCalendarService } from '@/lib/google'

// GET /api/calendar - List user's calendars
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const auth = await getAuthenticatedClient(userId)
  if (!auth) {
    return NextResponse.json({ error: 'Google non connesso', connected: false }, { status: 403 })
  }

  try {
    const calendar = getCalendarService(auth)
    const res = await calendar.calendarList.list()

    const calendars = (res.data.items || []).map((cal) => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description,
      backgroundColor: cal.backgroundColor,
      foregroundColor: cal.foregroundColor,
      primary: cal.primary || false,
      accessRole: cal.accessRole,
    }))

    return NextResponse.json({ calendars })
  } catch (e) {
    console.error('Calendar list error:', e)
    return NextResponse.json({ error: 'Errore nel recupero calendari' }, { status: 500 })
  }
}
