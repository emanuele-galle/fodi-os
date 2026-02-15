import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, getCalendarService } from '@/lib/google'
import { requirePermission } from '@/lib/permissions'
import { z } from 'zod'
import type { Role } from '@/generated/prisma/client'

const updateEventSchema = z.object({
  summary: z.string().min(1).optional(),
  start: z.string().min(1).optional(),
  end: z.string().min(1).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  calendarId: z.string().optional(),
})

// DELETE /api/calendar/events/[eventId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
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
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }

  const auth = await getAuthenticatedClient(userId)
  if (!auth) {
    return NextResponse.json({ error: 'Google non connesso', connected: false }, { status: 403 })
  }

  const { eventId } = await params
  const calendarId = request.nextUrl.searchParams.get('calendarId') || 'primary'

  try {
    const calendar = getCalendarService(auth)
    await calendar.events.delete({ calendarId, eventId })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Calendar delete error:', e)
    return NextResponse.json({ error: 'Errore nella cancellazione evento' }, { status: 500 })
  }
}

// PATCH /api/calendar/events/[eventId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
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
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }

  const auth = await getAuthenticatedClient(userId)
  if (!auth) {
    return NextResponse.json({ error: 'Google non connesso', connected: false }, { status: 403 })
  }

  const { eventId } = await params
  const body = await request.json()
  const parsed = updateEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { summary, description, start, end, location, calendarId } = parsed.data

  try {
    const calendar = getCalendarService(auth)
    const requestBody: Record<string, unknown> = {}
    if (summary !== undefined) requestBody.summary = summary
    if (description !== undefined) requestBody.description = description
    if (location !== undefined) requestBody.location = location
    if (start !== undefined) requestBody.start = { dateTime: start, timeZone: 'Europe/Rome' }
    if (end !== undefined) requestBody.end = { dateTime: end, timeZone: 'Europe/Rome' }

    const res = await calendar.events.patch({
      calendarId: calendarId || 'primary',
      eventId,
      requestBody,
    })

    return NextResponse.json(res.data)
  } catch (e) {
    console.error('Calendar update error:', e)
    return NextResponse.json({ error: 'Errore nella modifica evento' }, { status: 500 })
  }
}
