import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { uploadWithBackup, deleteWithBackup, renameOnGDrive } from '@/lib/storage'
import { validateFile } from '@/lib/file-validation'
import { logActivity } from '@/lib/activity-log'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const { projectId } = await params

    const folderId = request.nextUrl.searchParams.get('folderId')
    const where: Record<string, unknown> = { projectId }
    if (folderId) {
      where.folderId = folderId
    } else if (folderId === null || request.nextUrl.searchParams.has('folderId')) {
      // If folderId param is present but empty, show only root-level files
      where.folderId = null
    }

    const attachments = await prisma.projectAttachment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json({ items: attachments })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/:projectId/attachments]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
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
    const folderId = formData.get('folderId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'File obbligatorio' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const safeFileName = file.name.replace(/[\/\\:*?"<>|]/g, '_')
    const mimeType = file.type || 'application/octet-stream'

    // Validate file
    const validationError = validateFile(safeFileName, file.size, mimeType, buffer)
    if (validationError) {
      return NextResponse.json({ error: validationError.message }, { status: 400 })
    }

    // Verify project exists and get its name for GDrive folder
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, name: true } })
    if (!project) {
      return NextResponse.json({ error: 'Progetto non trovato' }, { status: 404 })
    }

    // Generate S3 key
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    const s3Key = `projects/${projectId}/${timestamp}-${random}.${ext}`

    // Upload: MinIO (primary) + GDrive (optional backup)
    const { fileUrl, driveFileId, webViewLink } = await uploadWithBackup(
      safeFileName,
      buffer,
      mimeType,
      s3Key,
      project.name // GDrive folder path
    )

    const attachment = await prisma.projectAttachment.create({
      data: {
        projectId,
        uploadedById: userId,
        folderId: folderId || null,
        fileName: safeFileName,
        fileUrl,
        fileSize: file.size,
        mimeType,
        driveFileId: driveFileId || null,
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    logActivity({
      userId,
      action: 'UPLOAD_ATTACHMENT',
      entityType: 'PROJECT',
      entityId: projectId,
      metadata: { attachmentId: attachment.id, fileName: safeFileName },
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/:projectId/attachments]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
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
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/:projectId/attachments]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
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

    // Delete from both MinIO and GDrive
    await deleteWithBackup(attachment.fileUrl, attachment.driveFileId)

    await prisma.projectAttachment.delete({ where: { id: attachmentId } })

    logActivity({
      userId,
      action: 'DELETE_ATTACHMENT',
      entityType: 'PROJECT',
      entityId: projectId,
      metadata: { attachmentId, fileName: attachment.fileName },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/:projectId/attachments]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
