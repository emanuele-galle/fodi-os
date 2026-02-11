import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { sseManager } from '@/lib/sse'
import type { Role } from '@/generated/prisma/client'

// Toggle reaction on a message (add/remove)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id: channelId, messageId } = await params
    const userId = request.headers.get('x-user-id')!
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'chat', 'write')

    // Verify membership
    const membership = await prisma.chatMember.findFirst({
      where: { channelId, userId },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Non sei membro di questo canale' }, { status: 403 })
    }

    const body = await request.json()
    const { emoji } = body
    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json({ error: 'Emoji obbligatorio' }, { status: 400 })
    }

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { channelId: true, metadata: true, deletedAt: true },
    })

    if (!message || message.channelId !== channelId) {
      return NextResponse.json({ error: 'Messaggio non trovato' }, { status: 404 })
    }
    if (message.deletedAt) {
      return NextResponse.json({ error: 'Messaggio eliminato' }, { status: 410 })
    }

    // Get current reactions from metadata
    const metadata = (message.metadata as Record<string, unknown>) || {}
    const reactions = (metadata.reactions as Record<string, string[]>) || {}
    const emojiReactions = reactions[emoji] || []

    // Toggle: add if not present, remove if present
    let newEmojiReactions: string[]
    if (emojiReactions.includes(userId)) {
      newEmojiReactions = emojiReactions.filter((id) => id !== userId)
    } else {
      newEmojiReactions = [...emojiReactions, userId]
    }

    const newReactions = { ...reactions }
    if (newEmojiReactions.length === 0) {
      delete newReactions[emoji]
    } else {
      newReactions[emoji] = newEmojiReactions
    }

    const updatedMessage = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        metadata: { ...metadata, reactions: newReactions },
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    })

    // Broadcast reaction update via SSE
    const members = await prisma.chatMember.findMany({
      where: { channelId },
      select: { userId: true },
    })
    sseManager.broadcast(channelId, members.map((m) => m.userId), {
      type: 'message_reaction',
      data: {
        id: messageId,
        metadata: updatedMessage.metadata,
      },
    })

    return NextResponse.json({ reactions: newReactions })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
