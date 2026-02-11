import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { sseManager } from '@/lib/sse'
import type { Role } from '@/generated/prisma/client'

// Edit a message (only author can edit)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id: channelId, messageId } = await params
    const userId = request.headers.get('x-user-id')!
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'chat', 'write')

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { authorId: true, channelId: true, deletedAt: true },
    })

    if (!message || message.channelId !== channelId) {
      return NextResponse.json({ error: 'Messaggio non trovato' }, { status: 404 })
    }
    if (message.authorId !== userId) {
      return NextResponse.json({ error: 'Puoi modificare solo i tuoi messaggi' }, { status: 403 })
    }
    if (message.deletedAt) {
      return NextResponse.json({ error: 'Messaggio eliminato' }, { status: 410 })
    }

    const body = await request.json()
    const { content } = body
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Contenuto obbligatorio' }, { status: 400 })
    }

    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: { content: content.trim(), editedAt: new Date() },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    })

    // Broadcast edit via SSE
    const members = await prisma.chatMember.findMany({
      where: { channelId },
      select: { userId: true },
    })
    sseManager.broadcast(channelId, members.map((m) => m.userId), {
      type: 'message_edited',
      data: updated,
    })

    return NextResponse.json(updated)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// Soft-delete a message (only author can delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id: channelId, messageId } = await params
    const userId = request.headers.get('x-user-id')!
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'chat', 'write')

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { authorId: true, channelId: true },
    })

    if (!message || message.channelId !== channelId) {
      return NextResponse.json({ error: 'Messaggio non trovato' }, { status: 404 })
    }
    if (message.authorId !== userId) {
      return NextResponse.json({ error: 'Puoi eliminare solo i tuoi messaggi' }, { status: 403 })
    }

    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    })

    // Broadcast deletion via SSE
    const members = await prisma.chatMember.findMany({
      where: { channelId },
      select: { userId: true },
    })
    sseManager.broadcast(channelId, members.map((m) => m.userId), {
      type: 'message_deleted',
      data: { id: messageId, channelId },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
