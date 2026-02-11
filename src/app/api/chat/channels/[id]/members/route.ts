import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission, requirePermission } from '@/lib/permissions'
import { addMembersSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: channelId } = await params
    const userId = request.headers.get('x-user-id')!
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'chat', 'write')

    const body = await request.json()
    const parsed = addMembersSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Check admin or channel OWNER/ADMIN
    if (!hasPermission(role, 'chat', 'admin')) {
      const membership = await prisma.chatMember.findFirst({
        where: { channelId, userId, role: { in: ['OWNER', 'ADMIN'] } },
      })
      if (!membership) {
        return NextResponse.json(
          { error: 'Solo admin o owner/admin del canale possono aggiungere membri' },
          { status: 403 }
        )
      }
    }

    // Filter out users already in channel
    const existing = await prisma.chatMember.findMany({
      where: { channelId, userId: { in: parsed.data.userIds } },
      select: { userId: true },
    })
    const existingIds = new Set(existing.map((e) => e.userId))
    const newUserIds = parsed.data.userIds.filter((id) => !existingIds.has(id))

    if (newUserIds.length > 0) {
      await prisma.chatMember.createMany({
        data: newUserIds.map((uid) => ({
          channelId,
          userId: uid,
          role: 'MEMBER' as const,
        })),
      })
    }

    return NextResponse.json({ added: newUserIds.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
