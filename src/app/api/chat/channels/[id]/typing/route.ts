import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { sseManager } from '@/lib/sse'
import type { Role } from '@/generated/prisma/client'

// Broadcast typing indicator
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: channelId } = await params
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

    // Get user name for typing indicator
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    // Broadcast to other channel members (exclude the typer)
    const members = await prisma.chatMember.findMany({
      where: { channelId },
      select: { userId: true },
    })
    const otherMembers = members.map((m) => m.userId).filter((id) => id !== userId)

    sseManager.broadcast(channelId, otherMembers, {
      type: 'typing',
      data: {
        userId,
        userName: `${user.firstName} ${user.lastName}`,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
