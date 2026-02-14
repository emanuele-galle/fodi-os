import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

// Find or create a DM channel between current user and target user
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'chat', 'write')

    const body = await request.json()
    const { targetUserId } = body

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'targetUserId obbligatorio' }, { status: 400 })
    }

    if (targetUserId === userId) {
      return NextResponse.json({ error: 'Non puoi avviare un DM con te stesso' }, { status: 400 })
    }

    // Check target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, firstName: true, lastName: true },
    })
    if (!targetUser) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    // Find existing DM channel between these two users
    const existingChannel = await prisma.chatChannel.findFirst({
      where: {
        type: 'DIRECT',
        isArchived: false,
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
        members: {
          every: {
            userId: { in: [userId, targetUserId] },
          },
        },
      },
      include: {
        _count: { select: { members: true } },
      },
    })

    if (existingChannel && existingChannel._count.members === 2) {
      return NextResponse.json(existingChannel)
    }

    // Get current user name for channel naming
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    })

    const channelName = `${currentUser?.firstName || ''} & ${targetUser.firstName}`
    const slug = `dm-${[userId, targetUserId].sort().join('-').slice(0, 50)}`

    // Check if slug already exists (edge case)
    const existingSlug = await prisma.chatChannel.findUnique({ where: { slug } })
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug

    const channel = await prisma.chatChannel.create({
      data: {
        name: channelName,
        slug: finalSlug,
        type: 'DIRECT',
        createdById: userId,
        members: {
          create: [
            { userId, role: 'OWNER' },
            { userId: targetUserId, role: 'MEMBER' },
          ],
        },
      },
      include: {
        _count: { select: { members: true } },
      },
    })

    return NextResponse.json(channel, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[chat/dm]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
