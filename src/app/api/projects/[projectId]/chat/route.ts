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

    // Find project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, slug: true },
    })
    if (!project) {
      return NextResponse.json({ error: 'Progetto non trovato' }, { status: 404 })
    }

    // Find existing PROJECT channel
    let channel = await prisma.chatChannel.findFirst({
      where: {
        projectId,
        type: 'PROJECT',
        isArchived: false,
      },
      include: {
        _count: { select: { members: true, messages: true } },
      },
    })

    // Create if not exists
    if (!channel) {
      channel = await prisma.chatChannel.create({
        data: {
          name: project.name,
          slug: `project-${project.slug}-${Date.now()}`,
          description: `Chat del progetto ${project.name}`,
          type: 'PROJECT',
          projectId,
          createdById: userId,
          members: {
            create: [{ userId, role: 'OWNER' }],
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
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
