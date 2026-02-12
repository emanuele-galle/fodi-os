import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { uploadFile } from '@/lib/s3'
import { sseManager } from '@/lib/sse'
import type { Role } from '@/generated/prisma/client'

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

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

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'File obbligatorio' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File troppo grande (max 25MB)' }, { status: 400 })
    }

    // Block dangerous file types
    const blockedExts = ['exe', 'bat', 'cmd', 'sh', 'php', 'jsp', 'cgi', 'html', 'htm', 'svg', 'msi', 'dll', 'scr', 'ps1']
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
    if (blockedExts.includes(ext)) {
      return NextResponse.json({ error: 'Tipo di file non consentito' }, { status: 400 })
    }

    // Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer())
    const key = `chat/${channelId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`

    const fileUrl = await uploadFile(key, buffer, file.type)

    // Create FILE_LINK message
    const message = await prisma.chatMessage.create({
      data: {
        channelId,
        authorId: userId,
        content: file.name,
        type: 'FILE_LINK',
        metadata: {
          fileName: file.name,
          fileUrl,
          fileSize: file.size,
          mimeType: file.type,
        },
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    })

    // Update channel timestamp
    await prisma.chatChannel.update({
      where: { id: channelId },
      data: { updatedAt: new Date() },
    })

    // Broadcast via SSE
    const members = await prisma.chatMember.findMany({
      where: { channelId },
      select: { userId: true },
    })
    sseManager.broadcast(channelId, members.map((m) => m.userId), {
      type: 'new_message',
      data: message,
    })

    return NextResponse.json(message, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
