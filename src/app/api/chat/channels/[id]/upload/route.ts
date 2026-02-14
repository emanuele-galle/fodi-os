import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { uploadFile } from '@/lib/s3'
import { sseManager } from '@/lib/sse'
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

    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File troppo grande (max 50MB)' }, { status: 400 })
    }

    // Block dangerous file types
    const blockedExts = ['exe', 'bat', 'cmd', 'sh', 'php', 'jsp', 'cgi', 'html', 'htm', 'svg', 'msi', 'dll', 'scr', 'ps1']
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
    if (blockedExts.includes(ext)) {
      return NextResponse.json({ error: 'Tipo di file non consentito' }, { status: 400 })
    }

    // Sanitize filename
    const safeName = file.name.replace(/[\/\\:*?"<>|]/g, '_').replace(/\.{2,}/g, '.')

    // Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer())
    const key = `chat/${channelId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`

    const fileUrl = await uploadFile(key, buffer, file.type)

    // Create FILE_LINK message
    const message = await prisma.chatMessage.create({
      data: {
        channelId,
        authorId: userId,
        content: safeName,
        type: 'FILE_LINK',
        metadata: {
          fileName: safeName,
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
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[chat/channels/:id/upload]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
