import { brand } from '@/lib/branding'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, getCalendarService, checkAuthStatus, withRetry, isScopeError } from '@/lib/google'
import { requirePermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { notifyUsers } from '@/lib/notifications'
import { sendDataChanged } from '@/lib/sse'
import { configureMeetSpace } from '@/lib/meet'
import { z } from 'zod'
import type { Role } from '@/generated/prisma/client'

const createEventSchema = z.object({
  summary: z.string().min(1, 'Titolo obbligatorio'),
  start: z.string().min(1, 'Data inizio non valida'),
  end: z.string().min(1, 'Data fine non valida'),
  description: z.string().optional(),
  location: z.string().optional(),
  attendees: z.array(z.string().email()).optional(),
  calendarId: z.string().optional(),
  withMeet: z.boolean().optional(),
  recurrence: z.array(z.string()).optional(),
})

const CALENDAR_VIEWER_ROLES: Role[] = ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'PM']

// GET /api/calendar/events - List Google Calendar events
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
    console.error('[calendar/events]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }

  const { searchParams } = request.nextUrl
  const timeMin = searchParams.get('timeMin') || new Date().toISOString()
  const timeMax = searchParams.get('timeMax')
  const calendarId = searchParams.get('calendarId') || 'primary'
  const maxResults = Math.min(250, parseInt(searchParams.get('maxResults') || '100'))
  const userIdsParam = searchParams.get('userIds')
  const role = request.headers.get('x-user-role') as Role

  // Multi-user mode: fetch events from multiple team members' calendars
  if (userIdsParam && CALENDAR_VIEWER_ROLES.includes(role)) {
    const targetIds = [...new Set(userIdsParam.split(',').filter(Boolean))]

    try {
      const targetUsers = await prisma.user.findMany({
        where: { id: { in: targetIds }, isActive: true },
        select: { id: true, firstName: true, lastName: true },
      })

      const results = await Promise.allSettled(
        targetUsers.map(async (user) => {
          const userAuth = await getAuthenticatedClient(user.id)
          if (!userAuth) return { userId: user.id, events: [] }

          const cal = getCalendarService(userAuth)
          const res = await cal.events.list({
            calendarId,
            timeMin,
            ...(timeMax && { timeMax }),
            maxResults,
            singleEvents: true,
            orderBy: 'startTime',
          })

          return {
            userId: user.id,
            events: (res.data.items || []).map((ev) => ({
              ...ev,
              _ownerUserId: user.id,
              _ownerName: `${user.firstName} ${user.lastName}`,
            })),
          }
        })
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allEvents: any[] = results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r: any) => r.value.events)

      // Deduplicate by eventId + ownerUserId
      const seen = new Set<string>()
      const unique = allEvents.filter((ev) => {
        const key = `${ev.id}_${ev._ownerUserId}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      return NextResponse.json({ events: unique, multi: true })
    } catch (e) {
      console.error('Calendar multi-user error:', e)
      return NextResponse.json({ error: 'Errore nel recupero eventi team' }, { status: 500 })
    }
  }

  // Single-user mode (default)
  const { client: auth, error: authError } = await checkAuthStatus(userId)
  if (!auth) {
    return NextResponse.json({
      error: authError === 'scopes' ? 'Permessi calendario insufficienti. Riconnetti Google.' : 'Google non connesso',
      connected: false,
      reason: authError,
    }, { status: 403 })
  }

  // Multi-calendar mode: fetch events from multiple Google calendars in parallel
  const calendarIdsParam = searchParams.get('calendarIds')
  if (calendarIdsParam) {
    const calIds = [...new Set(calendarIdsParam.split(',').filter(Boolean))]
    if (calIds.length === 0) {
      return NextResponse.json({ events: [] })
    }

    try {
      const calService = getCalendarService(auth)
      // Fetch calendar list to get colors
      const calListRes = await calService.calendarList.list()
      const calColorMap = new Map<string, string>()
      for (const cal of calListRes.data.items || []) {
        if (cal.id && cal.backgroundColor) {
          calColorMap.set(cal.id, cal.backgroundColor)
        }
      }

      const results = await Promise.allSettled(
        calIds.map(async (cId) => {
          const res = await calService.events.list({
            calendarId: cId,
            timeMin,
            ...(timeMax && { timeMax }),
            maxResults,
            singleEvents: true,
            orderBy: 'startTime',
          })
          return {
            calendarId: cId,
            events: (res.data.items || []).map((ev) => ({
              ...ev,
              _calendarId: cId,
              _calendarColor: calColorMap.get(cId) || '#039BE5',
            })),
          }
        })
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allEvents: any[] = results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r: any) => r.value.events)

      // Deduplicate by event id + calendarId
      const seen = new Set<string>()
      const unique = allEvents.filter((ev) => {
        const key = `${ev.id}_${ev._calendarId}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      return NextResponse.json({ events: unique, multiCalendar: true })
    } catch (e) {
      console.error('Calendar multi-calendar error:', e)
      return NextResponse.json({ error: 'Errore nel recupero eventi multi-calendario' }, { status: 500 })
    }
  }

  try {
    const calendar = getCalendarService(auth)
    const res = await withRetry(() =>
      calendar.events.list({
        calendarId,
        timeMin,
        ...(timeMax && { timeMax }),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      })
    )

    return NextResponse.json({
      events: res.data.items || [],
      nextPageToken: res.data.nextPageToken,
      summary: res.data.summary,
    })
  } catch (e) {
    if (isScopeError(e)) {
      // Delete invalid token and signal scope error
      await prisma.googleToken.delete({ where: { userId } }).catch(() => {})
      return NextResponse.json({
        error: 'Permessi calendario insufficienti. Riconnetti Google.',
        connected: false,
        reason: 'scopes',
      }, { status: 403 })
    }
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

  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[calendar/events]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }

  const { client: auth, error: authError } = await checkAuthStatus(userId)
  if (!auth) {
    return NextResponse.json({
      error: authError === 'scopes' ? 'Permessi calendario insufficienti. Riconnetti Google.' : 'Google non connesso',
      connected: false,
      reason: authError,
    }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { summary, description, start, end, location, attendees, calendarId, withMeet, recurrence } = parsed.data

  try {
    const calendar = getCalendarService(auth)
    const res = await withRetry(() => calendar.events.insert({
      calendarId: calendarId || 'primary',
      sendUpdates: 'all',
      ...(withMeet && { conferenceDataVersion: 1 }),
      requestBody: {
        summary,
        description,
        location,
        start: { dateTime: start, timeZone: 'Europe/Rome' },
        end: { dateTime: end, timeZone: 'Europe/Rome' },
        ...(recurrence && recurrence.length > 0 && { recurrence }),
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
    }))

    const meetLink = res.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === 'video'
    )?.uri || null

    // Configure Meet space: co-host for staff attendees + auto-recording
    const conferenceId = res.data.conferenceData?.conferenceId
    if (withMeet && conferenceId && attendees?.length) {
      try {
        const staffUsers = await prisma.user.findMany({
          where: { email: { in: attendees }, role: { not: 'CLIENT' }, isActive: true },
          select: { email: true },
        })
        const staffEmails = staffUsers.map((u) => u.email).filter(Boolean) as string[]

        if (staffEmails.length > 0) {
          await configureMeetSpace(auth, conferenceId, {
            coHostEmails: staffEmails,
            enableRecording: true,
          })
        }
      } catch (e) {
        console.warn('[calendar/events] Meet space configuration failed (non-blocking):', e)
      }
    }

    // Send notification to attendees
    if (attendees && attendees.length > 0) {
      const creator = await prisma.user.findUnique({
        where: { id: userId! },
        select: { firstName: true, lastName: true },
      })
      const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'Qualcuno'

      // Resolve attendee emails to user IDs
      const attendeeUsers = await prisma.user.findMany({
        where: { email: { in: attendees } },
        select: { id: true },
      })
      const attendeeIds = attendeeUsers.map((u) => u.id)

      if (attendeeIds.length > 0) {
        const eventDate = new Date(start).toLocaleDateString('it-IT', {
          day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
        })
        await notifyUsers(attendeeIds, userId, {
          type: 'calendar_invite',
          title: 'Nuovo evento in calendario',
          message: `${creatorName} ti ha invitato a "${summary}" - ${eventDate}`,
          link: '/calendar',
        })
        sendDataChanged(attendeeIds, 'calendar')
      }
    }

    return NextResponse.json({ ...res.data, meetLink }, { status: 201 })
  } catch (e) {
    if (isScopeError(e)) {
      await prisma.googleToken.delete({ where: { userId: userId! } }).catch(() => {})
      return NextResponse.json({
        error: 'Permessi calendario insufficienti. Riconnetti Google.',
        connected: false,
        reason: 'scopes',
      }, { status: 403 })
    }
    console.error('Calendar create error:', e)
    return NextResponse.json({ error: 'Errore nella creazione evento' }, { status: 500 })
  }
}
