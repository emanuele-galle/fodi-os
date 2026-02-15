import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

// Get the chat channel for a project, creating one if it doesn't exist
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

    // Find project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, slug: true },
    })
    if (!project) {
      return NextResponse.json({ error: 'Progetto non trovato' }, { status: 404 })
    }

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

    // Create if not exists
    if (!channel) {
      const folderName = folderId
        ? (await prisma.folder.findUnique({ where: { id: folderId }, select: { name: true } }))?.name
        : null
      const channelName = folderName ? `Chat - ${folderName}` : project.name
      const slugSuffix = folderName && folderId ? `folder-${folderId.slice(0, 8)}` : `project-${project.slug}`

      // Get all project members to auto-add them to the chat
      const projectMembers = await prisma.projectMember.findMany({
        where: { projectId },
        select: { userId: true },
      })

      // Build members list: creator as OWNER, rest as MEMBER (skip duplicates)
      const memberCreateData: { userId: string; role: 'OWNER' | 'MEMBER' }[] = [
        { userId, role: 'OWNER' },
      ]
      for (const pm of projectMembers) {
        if (pm.userId !== userId) {
          memberCreateData.push({ userId: pm.userId, role: 'MEMBER' })
        }
      }

      channel = await prisma.chatChannel.create({
        data: {
          name: channelName,
          slug: `${slugSuffix}-${Date.now()}`,
          description: folderName ? `Chat della cartella ${folderName}` : `Chat del progetto ${project.name}`,
          type: 'PROJECT',
          projectId,
          folderId,
          createdById: userId,
          members: {
            create: memberCreateData,
          },
        },
        include: {
          _count: { select: { members: true, messages: true } },
        },
      })
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
