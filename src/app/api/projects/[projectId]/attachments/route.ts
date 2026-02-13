import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { uploadToGDrive, deleteFromGDrive, renameOnGDrive } from '@/lib/storage'
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

    // Verify project exists and get its name for GDrive folder
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, name: true } })
    if (!project) {
      return NextResponse.json({ error: 'Progetto non trovato' }, { status: 404 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const safeFileName = file.name.replace(/[\/\\:*?"<>|]/g, '_')

    // Upload to Google Drive (admin account)
    const { fileId, webViewLink } = await uploadToGDrive(
      safeFileName,
      buffer,
      file.type || 'application/octet-stream',
      project.name
    )

    const attachment = await prisma.projectAttachment.create({
      data: {
        projectId,
        uploadedById: userId,
        fileName: safeFileName,
        fileUrl: webViewLink,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        driveFileId: fileId,
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const { projectId } = await params
    const { searchParams } = request.nextUrl
    const attachmentId = searchParams.get('attachmentId')

    if (!attachmentId) {
      return NextResponse.json({ error: 'attachmentId obbligatorio' }, { status: 400 })
    }

    const body = await request.json()
    const newFileName = body.fileName?.trim()
    if (!newFileName) {
      return NextResponse.json({ error: 'fileName obbligatorio' }, { status: 400 })
    }

    const attachment = await prisma.projectAttachment.findFirst({
      where: { id: attachmentId, projectId },
    })
    if (!attachment) {
      return NextResponse.json({ error: 'Allegato non trovato' }, { status: 404 })
    }

    // Rename on Google Drive if available
    if (attachment.driveFileId) {
      try {
        await renameOnGDrive(attachment.driveFileId, newFileName)
      } catch {
        console.error(`Failed to rename file on GDrive for attachment ${attachmentId}`)
      }
    }

    const updated = await prisma.projectAttachment.update({
      where: { id: attachmentId },
      data: { fileName: newFileName },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json(updated)
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

    // Delete from Google Drive if driveFileId exists, otherwise try S3 (legacy)
    try {
      if (attachment.driveFileId) {
        await deleteFromGDrive(attachment.driveFileId)
      } else {
        // Legacy: file was on S3/MinIO
        const { deleteFile } = await import('@/lib/s3')
        const url = new URL(attachment.fileUrl)
        const key = url.pathname.replace(/^\/[^/]+\//, '')
        await deleteFile(key)
      }
    } catch {
      console.error(`Failed to delete file for attachment ${attachmentId}`)
    }

    await prisma.projectAttachment.delete({ where: { id: attachmentId } })

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
