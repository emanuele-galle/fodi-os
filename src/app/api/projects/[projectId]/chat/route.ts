import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

// Get the chat channel for a project (no auto-creation)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const userId = request.headers.get('x-user-id')!
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const folderId = request.nextUrl.searchParams.get('folderId') || null

    // Find existing PROJECT channel (filtered by folderId)
    const channel = await prisma.chatChannel.findFirst({
      where: {
        projectId,
        folderId,
        type: 'PROJECT',
        isArchived: false,
      },
      include: {
        _count: { select: { members: true, messages: true } },
      },
    })

    if (!channel) {
      return NextResponse.json(null)
    }

    // Ensure current user is a member
    const membership = await prisma.chatMember.findFirst({
      where: { channelId: channel.id, userId },
    })
    if (!membership) {
      await prisma.chatMember.create({
        data: { channelId: channel.id, userId, role: 'MEMBER' },
      })
    }

    return NextResponse.json(channel)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/:projectId/chat]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
