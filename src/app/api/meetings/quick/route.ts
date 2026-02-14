import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient, getCalendarService } from '@/lib/google'
import { prisma } from '@/lib/prisma'
import { sseManager } from '@/lib/sse'
import { sendPush } from '@/lib/push'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

// POST /api/meetings/quick - Create a quick meeting with Google Meet
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
    console.error('[meetings/quick]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
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

    // Determine who to notify: channel members or attendees by email
    let targetUserIds: string[] = []
    let channelName: string | null = null

    if (channelId) {
      const channelMembers = await prisma.chatMember.findMany({
        where: { channelId, userId: { not: userId } },
        select: { userId: true },
      })
      targetUserIds = channelMembers.map((m) => m.userId)
      const channel = await prisma.chatChannel.findUnique({
        where: { id: channelId },
        select: { name: true },
      })
      channelName = channel?.name || null
    } else if (attendeeEmails.length > 0) {
      // Find users by email (for calls from Team page without channelId)
      const attendees = await prisma.user.findMany({
        where: { email: { in: attendeeEmails }, id: { not: userId } },
        select: { id: true },
      })
      targetUserIds = attendees.map((u) => u.id)
    }

    if (targetUserIds.length > 0) {
      const title = 'Chiamata in arrivo'
      const message = `${creatorName} ti sta chiamando${channelName ? ` da "${channelName}"` : ''}`

      // DB notifications
      await prisma.notification.createMany({
        data: targetUserIds.map((uid) => ({
          userId: uid,
          type: 'MEETING',
          title,
          message,
          link: meetLink,
        })),
      })

      // SSE call event (shows in-app call banner with ringtone)
      for (const uid of targetUserIds) {
        sseManager.sendToUser(uid, {
          type: 'incoming_call',
          data: {
            meetLink,
            summary,
            creatorName,
            channelId: channelId || undefined,
            channelName: channelName || undefined,
          },
        })
      }

      // Web push so phone rings even if app is closed
      for (const uid of targetUserIds) {
        sendPush(uid, {
          title,
          message,
          link: meetLink,
        })
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
