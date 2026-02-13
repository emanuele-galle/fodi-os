import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { uploadFile, deleteFile } from '@/lib/s3'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const { projectId } = await params

    const attachments = await prisma.projectAttachment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json({ items: attachments })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'pm', 'write')

    const { projectId } = await params

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'File obbligatorio' }, { status: 400 })
    }

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File troppo grande (max 50 MB)' }, { status: 400 })
    }

    // Block dangerous file types
    const blockedExts = ['exe', 'bat', 'cmd', 'sh', 'php', 'jsp', 'cgi', 'html', 'htm', 'svg', 'msi', 'dll', 'scr', 'ps1']
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
    if (blockedExts.includes(ext)) {
      return NextResponse.json({ error: 'Tipo di file non consentito' }, { status: 400 })
    }

    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
    if (!project) {
      return NextResponse.json({ error: 'Progetto non trovato' }, { status: 404 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const safeFileName = file.name.replace(/[\/\\:*?"<>|]/g, '_')
    const key = `projects/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const fileUrl = await uploadFile(key, buffer, file.type || 'application/octet-stream')

    const attachment = await prisma.projectAttachment.create({
      data: {
        projectId,
        uploadedById: userId,
        fileName: safeFileName,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const { projectId } = await params
    const { searchParams } = request.nextUrl
    const attachmentId = searchParams.get('attachmentId')

    if (!attachmentId) {
      return NextResponse.json({ error: 'attachmentId obbligatorio' }, { status: 400 })
    }

    const attachment = await prisma.projectAttachment.findFirst({
      where: { id: attachmentId, projectId },
    })
    if (!attachment) {
      return NextResponse.json({ error: 'Allegato non trovato' }, { status: 404 })
    }

    // Delete file from S3 before removing DB record
    try {
      const url = new URL(attachment.fileUrl)
      const key = url.pathname.replace(/^\/[^/]+\//, '') // Remove leading /bucket/
      await deleteFile(key)
    } catch {
      // Log but don't block deletion if S3 cleanup fails
      console.error(`Failed to delete S3 file for attachment ${attachmentId}`)
    }

    await prisma.projectAttachment.delete({ where: { id: attachmentId } })

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
