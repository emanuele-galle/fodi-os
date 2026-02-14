import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, getCalendarService } from '@/lib/google'
import { prisma } from '@/lib/prisma'
import { sseManager } from '@/lib/sse'
import { sendPush } from '@/lib/push'

// POST /api/meetings/quick - Create a quick meeting with Google Meet
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
  const summary = body.summary || 'Riunione veloce'
  const durationMinutes = body.duration || 30
  const attendeeEmails: string[] = body.attendeeEmails || []
  const channelId: string | undefined = body.channelId

  const now = new Date()
  const end = new Date(now.getTime() + durationMinutes * 60 * 1000)

  try {
    const calendar = getCalendarService(auth)
    const res = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      sendUpdates: attendeeEmails.length > 0 ? 'all' : 'none',
      requestBody: {
        summary,
        start: { dateTime: now.toISOString(), timeZone: 'Europe/Rome' },
        end: { dateTime: end.toISOString(), timeZone: 'Europe/Rome' },
        ...(attendeeEmails.length > 0 && {
          attendees: attendeeEmails.map((email) => ({ email })),
        }),
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

    // Get creator info for notifications
    const creator = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    })
    const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'Qualcuno'

    // Create notifications for channel members if channelId provided
    if (channelId) {
      const channelMembers = await prisma.chatMember.findMany({
        where: { channelId, userId: { not: userId } },
        select: { userId: true },
      })

      if (channelMembers.length > 0) {
        const channel = await prisma.chatChannel.findUnique({
          where: { id: channelId },
          select: { name: true },
        })

        const title = 'Chiamata in arrivo'
        const message = `${creatorName} ti sta chiamando${channel?.name ? ` da "${channel.name}"` : ''}`

        // DB notifications
        await prisma.notification.createMany({
          data: channelMembers.map((m) => ({
            userId: m.userId,
            type: 'MEETING',
            title,
            message,
            link: meetLink,
          })),
        })

        const memberIds = channelMembers.map((m) => m.userId)

        // SSE call event (shows in-app call banner)
        for (const memberId of memberIds) {
          sseManager.sendToUser(memberId, {
            type: 'incoming_call',
            data: {
              meetLink,
              summary,
              creatorName,
              channelId,
              channelName: channel?.name,
            },
          })
        }

        // Web push so phone rings even if app is closed
        for (const memberId of memberIds) {
          sendPush(memberId, {
            title,
            message,
            link: meetLink,
          })
        }
      }
    }

    return NextResponse.json({
      meetLink,
      eventId: res.data.id,
      summary: res.data.summary,
      duration: durationMinutes,
    }, { status: 201 })
  } catch (e) {
    console.error('Quick meet error:', e)
    return NextResponse.json({ error: 'Errore nella creazione del meeting' }, { status: 500 })
  }
}
