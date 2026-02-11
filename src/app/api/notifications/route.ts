import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    })

    return NextResponse.json({ items: notifications, unreadCount })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!
    const body = await request.json()
    const { ids, all } = body

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
    } else {
      return NextResponse.json({ error: 'ids or all is required' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
