import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission, requirePermission } from '@/lib/permissions'
import { updateChannelSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = request.headers.get('x-user-id')!
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'chat', 'read')

    const channel = await prisma.chatChannel.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, role: true },
            },
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    })

    if (!channel) {
      return NextResponse.json({ error: 'Canale non trovato' }, { status: 404 })
    }

    // Check membership
    const isMember = channel.members.some((m) => m.userId === userId)
    if (!isMember && !hasPermission(role, 'chat', 'admin')) {
      return NextResponse.json({ error: 'Non sei membro di questo canale' }, { status: 403 })
    }

    return NextResponse.json({
      ...channel,
      messages: channel.messages.reverse(), // chronological order
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[chat/channels/:id]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = request.headers.get('x-user-id')!
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'chat', 'write')

    const body = await request.json()
    const parsed = updateChannelSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Check admin or channel OWNER
    if (!hasPermission(role, 'chat', 'admin')) {
      const membership = await prisma.chatMember.findFirst({
        where: { channelId: id, userId, role: 'OWNER' },
      })
      if (!membership) {
        return NextResponse.json({ error: 'Solo admin o owner del canale possono modificarlo' }, { status: 403 })
      }
    }

    const channel = await prisma.chatChannel.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json(channel)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[chat/channels/:id]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = request.headers.get('x-user-id')!
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'chat', 'write')

    // Only admin or channel OWNER can delete
    if (!hasPermission(role, 'chat', 'admin')) {
      const membership = await prisma.chatMember.findFirst({
        where: { channelId: id, userId, role: 'OWNER' },
      })
      if (!membership) {
        return NextResponse.json({ error: 'Solo admin o owner del canale possono eliminarlo' }, { status: 403 })
      }
    }

    // Cascade delete handles members and messages
    await prisma.chatChannel.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[chat/channels/:id]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
