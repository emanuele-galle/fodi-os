import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedClient, getCalendarService } from '@/lib/google'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/ip'

const bookingSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio').max(100),
  email: z.string().email('Email non valida'),
  phone: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido'),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/, 'Formato orario non valido'),
  notes: z.string().max(500).optional(),
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params

  // Rate limit: 3 req/IP/10min
  const ip = getClientIp(request)
  if (!rateLimit(`book:${ip}`, 3, 600000)) {
    return NextResponse.json({ error: 'Troppe richieste. Riprova tra qualche minuto.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const data = bookingSchema.parse(body)

    const card = await prisma.digitalCard.findUnique({
      where: { slug },
      select: {
        showBooking: true,
        bookingDuration: true,
        bookingStartHour: true,
        bookingEndHour: true,
        userId: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
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

    // Build event start/end
    const [hour, min] = data.timeSlot.split(':').map(Number)

    // Validate time is within working hours
    if (hour < card.bookingStartHour || hour >= card.bookingEndHour) {
      return NextResponse.json({ error: 'Orario non disponibile' }, { status: 400 })
    }

    const startDateTime = `${data.date}T${data.timeSlot}:00`
    const endMinutes = min + card.bookingDuration
    const endHour = hour + Math.floor(endMinutes / 60)
    const endMin = endMinutes % 60
    const endDateTime = `${data.date}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`

    const ownerName = `${card.user.firstName} ${card.user.lastName}`

    // Create Google Calendar event
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Appuntamento con ${data.name}`,
        description: [
          `Prenotazione via card digitale di ${ownerName}`,
          '',
          `Nome: ${data.name}`,
          `Email: ${data.email}`,
          data.phone ? `Telefono: ${data.phone}` : null,
          data.notes ? `\nNote: ${data.notes}` : null,
        ].filter(Boolean).join('\n'),
        start: {
          dateTime: startDateTime,
          timeZone: timezone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: timezone,
        },
        attendees: [
          { email: data.email, displayName: data.name },
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      },
    })

    // Create Lead in CRM
    await prisma.lead.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        message: data.notes || `Prenotazione appuntamento ${data.date} alle ${data.timeSlot}`,
        source: `booking:${slug}`,
        status: 'NEW',
      }
    })

    return NextResponse.json({
      success: true,
      eventId: event.data.id,
      message: 'Appuntamento prenotato con successo!',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dati non validi', details: error.issues }, { status: 400 })
    }
    console.error('POST /api/c/[slug]/book error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
