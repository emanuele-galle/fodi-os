import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { markNotificationsReadSchema } from '@/lib/validation'
import { sendBadgeUpdate } from '@/lib/sse'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!
    const { searchParams } = request.nextUrl
    const unread = searchParams.get('unread')
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unread === 'true' && { isRead: false }),
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    })

    return NextResponse.json({ items: notifications, unreadCount })
  } catch (e) {
    console.error('[notifications]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!
    const body = await request.json()
    const parsed = markNotificationsReadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { ids, all } = parsed.data

    if (all) {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      })
    } else if (ids?.length) {
      await prisma.notification.updateMany({
        where: { id: { in: ids }, userId },
        data: { isRead: true },
      })
    }

    // Send updated badge count
    const newUnread = await prisma.notification.count({ where: { userId, isRead: false } })
    sendBadgeUpdate(userId, { notifications: newUnread })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[notifications]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
