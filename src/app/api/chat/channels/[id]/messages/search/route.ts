import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: channelId } = await params
    const userId = request.headers.get('x-user-id')!
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'chat', 'read')

    // Verify membership
    const membership = await prisma.chatMember.findFirst({
      where: { channelId, userId },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Non sei membro di questo canale' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const query = searchParams.get('q')
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query di ricerca troppo corta (min 2 caratteri)' }, { status: 400 })
    }

    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    const messages = await prisma.chatMessage.findMany({
      where: {
        channelId,
        deletedAt: null,
        content: {
          contains: query.trim(),
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json({ items: messages, total: messages.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
