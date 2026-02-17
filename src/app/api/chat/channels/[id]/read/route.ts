import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sseManager } from '@/lib/sse'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: channelId } = await params
    const userId = request.headers.get('x-user-id')!

    const now = new Date()
    await prisma.chatMember.updateMany({
      where: { channelId, userId },
      data: { lastReadAt: now },
    })

    // Broadcast read receipt to all channel members via SSE
    const members = await prisma.chatMember.findMany({
      where: { channelId },
      select: { userId: true },
    })
    const memberUserIds = members.map((m) => m.userId)

    sseManager.broadcast(channelId, memberUserIds, {
      type: 'message_read',
      data: { userId, lastReadAt: now.toISOString() },
    })

    return NextResponse.json({ success: true, lastReadAt: now.toISOString() })
  } catch (e) {
    console.error('[chat/channels/:id/read]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
