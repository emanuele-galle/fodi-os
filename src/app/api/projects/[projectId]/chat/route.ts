import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { slugify } from '@/lib/utils'
import type { Role } from '@/generated/prisma/client'

// Get or auto-create the chat channel for a project
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
    let channel = await prisma.chatChannel.findFirst({
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

    // Auto-create channel if it doesn't exist
    if (!channel) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true },
      })
      if (!project) {
        return NextResponse.json(null)
      }

      let folderName = ''
      if (folderId) {
        const folder = await prisma.folder.findUnique({
          where: { id: folderId },
          select: { name: true },
        })
        folderName = folder?.name || ''
      }

      const channelName = folderId && folderName
        ? `Chat - ${folderName}`
        : `Chat - ${project.name}`
      const baseSlug = slugify(channelName)
      const existing = await prisma.chatChannel.findUnique({ where: { slug: baseSlug } })
      const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug

      channel = await prisma.chatChannel.create({
        data: {
          name: channelName,
          slug,
          type: 'PROJECT',
          projectId,
          folderId,
          createdById: userId,
          members: {
            create: { userId, role: 'ADMIN' },
          },
        },
        include: {
          _count: { select: { members: true, messages: true } },
        },
      })

      return NextResponse.json(channel)
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
