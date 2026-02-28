import { getAuthenticatedClient, getCalendarService, withRetry } from '@/lib/google'
import type { AiToolDefinition, AiToolInput, AiToolContext } from '../types'

export const calendarTools: AiToolDefinition[] = [
  {
    name: 'list_calendar_events',
    description: 'Lista gli eventi del calendario Google dell\'utente per un intervallo di date.',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Data inizio (ISO 8601, default: oggi)' },
        endDate: { type: 'string', description: 'Data fine (ISO 8601, default: +7 giorni)' },
        limit: { type: 'number', description: 'Numero massimo eventi (default: 20)' },
      },
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const client = await getAuthenticatedClient(context.userId)
      if (!client) return { success: false, error: 'Google Calendar non collegato. L\'utente deve collegare il proprio account Google dalle Impostazioni.' }

      const calendar = getCalendarService(client)
      const now = new Date()
      const timeMin = input.startDate ? new Date(input.startDate as string) : now
      const timeMax = input.endDate ? new Date(input.endDate as string) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const res = await withRetry(() =>
        calendar.events.list({
          calendarId: 'primary',
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          maxResults: Math.min(Number(input.limit) || 20, 50),
          singleEvents: true,
          orderBy: 'startTime',
        })
      )

      const events = (res.data.items || []).map((e) => ({
        id: e.id,
        summary: e.summary,
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        location: e.location,
        description: e.description?.slice(0, 200),
        attendees: e.attendees?.map((a) => ({ email: a.email, status: a.responseStatus })),
        meetLink: e.hangoutLink,
      }))

      return { success: true, data: { events, total: events.length } }
    },
  },

  {
    name: 'create_calendar_event',
    description: 'Crea un nuovo evento nel calendario Google dell\'utente.',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Titolo dell\'evento (obbligatorio)' },
        startDateTime: { type: 'string', description: 'Data/ora inizio (ISO 8601, obbligatorio)' },
        endDateTime: { type: 'string', description: 'Data/ora fine (ISO 8601, obbligatorio)' },
        description: { type: 'string', description: 'Descrizione' },
        location: { type: 'string', description: 'Luogo' },
        attendees: {
          type: 'array',
          description: 'Lista email partecipanti',
          items: { type: 'string' },
        },
      },
      required: ['summary', 'startDateTime', 'endDateTime'],
    },
    module: 'pm',
    requiredPermission: 'write',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const client = await getAuthenticatedClient(context.userId)
      if (!client) return { success: false, error: 'Google Calendar non collegato. L\'utente deve collegare il proprio account Google dalle Impostazioni.' }

      const calendar = getCalendarService(client)

      const event = await withRetry(() =>
        calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: input.summary as string,
            description: (input.description as string) || undefined,
            location: (input.location as string) || undefined,
            start: { dateTime: input.startDateTime as string, timeZone: 'Europe/Rome' },
            end: { dateTime: input.endDateTime as string, timeZone: 'Europe/Rome' },
            attendees: (input.attendees as string[] || []).map((email) => ({ email })),
          },
        })
      )

      return {
        success: true,
        data: {
          id: event.data.id,
          summary: event.data.summary,
          start: event.data.start?.dateTime,
          end: event.data.end?.dateTime,
          htmlLink: event.data.htmlLink,
        },
      }
    },
  },

  {
    name: 'find_free_slots',
    description: 'Trova slot liberi nel calendario dell\'utente per pianificare un incontro.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Data da controllare (YYYY-MM-DD, default: domani)' },
        durationMinutes: { type: 'number', description: 'Durata dell\'incontro in minuti (default: 60)' },
        startHour: { type: 'number', description: 'Ora inizio giornata lavorativa (default: 9)' },
        endHour: { type: 'number', description: 'Ora fine giornata lavorativa (default: 18)' },
      },
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (input: AiToolInput, context: AiToolContext) => {
      const client = await getAuthenticatedClient(context.userId)
      if (!client) return { success: false, error: 'Google Calendar non collegato.' }

      const calendar = getCalendarService(client)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = (input.date as string) || tomorrow.toISOString().split('T')[0]
      const duration = Number(input.durationMinutes) || 60
      const startHour = Number(input.startHour) || 9
      const endHour = Number(input.endHour) || 18

      const dayStart = new Date(`${dateStr}T${String(startHour).padStart(2, '0')}:00:00+01:00`)
      const dayEnd = new Date(`${dateStr}T${String(endHour).padStart(2, '0')}:00:00+01:00`)

      const res = await withRetry(() =>
        calendar.events.list({
          calendarId: 'primary',
          timeMin: dayStart.toISOString(),
          timeMax: dayEnd.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
        })
      )

      const events = (res.data.items || [])
        .filter((e) => e.start?.dateTime && e.end?.dateTime)
        .map((e) => ({
          start: new Date(e.start!.dateTime!).getTime(),
          end: new Date(e.end!.dateTime!).getTime(),
        }))

      // Find free slots
      const slots: { start: string; end: string }[] = []
      let cursor = dayStart.getTime()
      const durationMs = duration * 60 * 1000

      for (const event of events) {
        if (event.start - cursor >= durationMs) {
          slots.push({
            start: new Date(cursor).toISOString(),
            end: new Date(cursor + durationMs).toISOString(),
          })
        }
        cursor = Math.max(cursor, event.end)
      }

      if (dayEnd.getTime() - cursor >= durationMs) {
        slots.push({
          start: new Date(cursor).toISOString(),
          end: new Date(cursor + durationMs).toISOString(),
        })
      }

      return { success: true, data: { date: dateStr, duration, slots, totalFreeSlots: slots.length } }
    },
  },
]
