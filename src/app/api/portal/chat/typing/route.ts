import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalClient, handlePortalError } from '@/lib/portal-auth'
import { sseManager } from '@/lib/sse'

export async function POST(request: NextRequest) {
  try {
    const client = await requirePortalClient(request)
    const slug = `client-${client.id}`

    const channel = await prisma.chatChannel.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!channel) {
      return NextResponse.json({ error: 'Canale non trovato' }, { status: 404 })
    }

    const members = await prisma.chatMember.findMany({
      where: { channelId: channel.id },
      select: { userId: true },
    })
    const otherMembers = members.map((m) => m.userId).filter((id) => id !== client.userId)

    sseManager.broadcast(channel.id, otherMembers, {
      type: 'typing',
      data: {
        userId: client.userId,
        userName: client.companyName,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return handlePortalError(e, 'portal/chat/typing')
  }
}
