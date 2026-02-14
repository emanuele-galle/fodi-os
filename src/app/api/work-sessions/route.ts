import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

// Gap threshold for auto-closing stale sessions
const SESSION_GAP_MS = 5 * 60 * 1000

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100')))

    // Auto-close stale open sessions (lastHeartbeat > 5 min ago)
    const staleThreshold = new Date(Date.now() - SESSION_GAP_MS)
    const staleSessions = await prisma.workSession.findMany({
      where: { clockOut: null, lastHeartbeat: { lt: staleThreshold } },
    })
    for (const s of staleSessions) {
      const durationMins = Math.round(
        (new Date(s.lastHeartbeat).getTime() - new Date(s.clockIn).getTime()) / 60000
      )
      await prisma.workSession.update({
        where: { id: s.id },
        data: { clockOut: s.lastHeartbeat, durationMins },
      })
    }

    const where = {
      ...(userId && { userId }),
      ...(from || to
        ? {
            clockIn: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to + 'T23:59:59.999Z') }),
            },
          }
        : {}),
    }

    const sessions = await prisma.workSession.findMany({
      where,
      take: limit,
      orderBy: { clockIn: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    })

    // Calculate live duration for active sessions
    const now = Date.now()
    const items = sessions.map((s) => {
      const isActive = !s.clockOut
      const effectiveEnd = s.clockOut ? new Date(s.clockOut).getTime() : now
      const liveDurationMins = Math.round(
        (effectiveEnd - new Date(s.clockIn).getTime()) / 60000
      )
      return {
        ...s,
        durationMins: s.durationMins ?? liveDurationMins,
        liveDurationMins,
        isActive,
      }
    })

    return NextResponse.json({ items })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST: manual clock-out
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const action = body.action as string

    if (action === 'clock-out') {
      const session = await prisma.workSession.findFirst({
        where: { userId, clockOut: null },
        orderBy: { clockIn: 'desc' },
      })

      if (!session) {
        return NextResponse.json({ error: 'Nessuna sessione attiva' }, { status: 404 })
      }

      const now = new Date()
      const durationMins = Math.round(
        (now.getTime() - new Date(session.clockIn).getTime()) / 60000
      )

      const updated = await prisma.workSession.update({
        where: { id: session.id },
        data: { clockOut: now, durationMins },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      })

      return NextResponse.json(updated)
    }

    if (action === 'clock-in') {
      // Close any stale open session first
      const existing = await prisma.workSession.findFirst({
        where: { userId, clockOut: null },
      })
      if (existing) {
        return NextResponse.json({ error: 'Sei già connesso' }, { status: 409 })
      }

      const session = await prisma.workSession.create({
        data: { userId, clockIn: new Date(), lastHeartbeat: new Date() },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      })

      return NextResponse.json(session, { status: 201 })
    }

    return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
