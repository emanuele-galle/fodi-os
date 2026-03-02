import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalClient, handlePortalError } from '@/lib/portal-auth'

export async function GET(request: NextRequest) {
  try {
    const client = await requirePortalClient(request)
    const slug = `client-${client.id}`

    // Find existing channel
    let channel = await prisma.chatChannel.findUnique({
      where: { slug },
      select: { id: true, name: true },
    })

    // Auto-create if not exists
    if (!channel) {
      // Find first active ADMIN or support user to add as owner
      const supportUser = await prisma.user.findFirst({
        where: {
          role: { in: ['ADMIN', 'DIR_SUPPORT'] },
          isActive: true,
        },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })

      if (!supportUser) {
        return NextResponse.json({ error: 'Nessun operatore disponibile' }, { status: 503 })
      }

      channel = await prisma.chatChannel.create({
        data: {
          name: `Chat ${client.companyName}`,
          slug,
          type: 'PRIVATE',
          createdById: supportUser.id,
          members: {
            create: [
              { userId: client.userId, role: 'MEMBER' },
              { userId: supportUser.id, role: 'OWNER' },
            ],
          },
          messages: {
            create: {
              authorId: supportUser.id,
              content: 'Benvenuto nella chat assistenza! Scrivi qui per contattare il nostro team.',
              type: 'SYSTEM',
            },
          },
        },
        select: { id: true, name: true },
      })
    }

    // Ensure client is a member (in case channel was created externally)
    const membership = await prisma.chatMember.findFirst({
      where: { channelId: channel.id, userId: client.userId },
    })
    if (!membership) {
      await prisma.chatMember.create({
        data: { channelId: channel.id, userId: client.userId, role: 'MEMBER' },
      })
    }

    return NextResponse.json({ channelId: channel.id, channelName: channel.name })
  } catch (e) {
    return handlePortalError(e, 'portal/chat')
  }
}
