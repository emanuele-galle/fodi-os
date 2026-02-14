import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Gap threshold: if no heartbeat for 5 minutes, session is considered ended
const SESSION_GAP_MS = 5 * 60 * 1000

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const now = new Date()

  // Update lastActiveAt
  await prisma.user.update({
    where: { id: userId },
    data: { lastActiveAt: now },
  })

  // Find active session (no clockOut)
  const activeSession = await prisma.workSession.findFirst({
    where: { userId, clockOut: null },
    orderBy: { clockIn: 'desc' },
  })

  if (activeSession) {
    const lastBeat = new Date(activeSession.lastHeartbeat)
    const gap = now.getTime() - lastBeat.getTime()

    if (gap > SESSION_GAP_MS) {
      // Gap too large: close old session at lastHeartbeat and start new one
      const durationMins = Math.round(
        (lastBeat.getTime() - new Date(activeSession.clockIn).getTime()) / 60000
      )
      await prisma.workSession.update({
        where: { id: activeSession.id },
        data: { clockOut: lastBeat, durationMins },
      })

      // Start new session
      await prisma.workSession.create({
        data: { userId, clockIn: now, lastHeartbeat: now },
      })
    } else {
      // Extend current session
      await prisma.workSession.update({
        where: { id: activeSession.id },
        data: { lastHeartbeat: now },
      })
    }
  } else {
    // No active session: clock in
    await prisma.workSession.create({
      data: { userId, clockIn: now, lastHeartbeat: now },
    })
  }

  return NextResponse.json({ ok: true })
}
