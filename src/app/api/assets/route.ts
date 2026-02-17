import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { uploadFile } from '@/lib/s3'
import { uploadToGDrive } from '@/lib/storage'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'content', 'read')

    const { searchParams } = request.nextUrl
    const projectId = searchParams.get('projectId')
    const category = searchParams.get('category')
    const tags = searchParams.get('tags')
    const mimeType = searchParams.get('mimeType')
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where = {
      ...(projectId && { projectId }),
      ...(category && { category }),
      ...(tags && { tags: { hasSome: tags.split(',') } }),
      ...(mimeType && { mimeType: { startsWith: mimeType } }),
      ...(search && {
        OR: [
          { fileName: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [items, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { id: true, firstName: true, lastName: true } },
          project: { select: { id: true, name: true } },
          _count: { select: { reviews: true } },
        },
      }),
      prisma.asset.count({ where }),
    ])

    return NextResponse.json({ items, total, page, limit })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[assets]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

function getCategoryFromMime(mime: string): string {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.includes('pdf') || mime.includes('document') || mime.includes('text')) return 'document'
  return 'other'
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'content', 'write')

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'File obbligatorio' }, { status: 400 })
    }

    const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File troppo grande (max 500MB)' }, { status: 400 })
    }

    // Block dangerous file types
    const blockedExts = ['exe', 'bat', 'cmd', 'sh', 'php', 'jsp', 'cgi', 'html', 'htm', 'svg', 'msi', 'dll', 'scr', 'ps1']
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
    if (blockedExts.includes(ext)) {
      return NextResponse.json({ error: 'Tipo di file non consentito' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const safeFileName = file.name.replace(/[\/\\:*?"<>|]/g, '_')
    const mimeType = file.type || 'application/octet-stream'
    const category = (formData.get('category') as string) || getCategoryFromMime(mimeType)
    const projectId = formData.get('projectId') as string | null
    const description = formData.get('description') as string | null
    const tagsRaw = formData.get('tags') as string | null
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : []

    // Upload to MinIO
    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2, 8)
    const key = `assets/${userId}/${timestamp}-${random}.${ext}`
    const fileUrl = await uploadFile(key, buffer, mimeType)

    // Upload to Google Drive (best-effort, don't fail if GDrive is unavailable)
    let driveFileId: string | null = null
    try {
      const result = await uploadToGDrive(safeFileName, buffer, mimeType, 'Assets')
      driveFileId = result.fileId
    } catch (err) {
      console.warn('[assets] GDrive upload failed (continuing with MinIO only):', (err as Error).message)
    }

    const asset = await prisma.asset.create({
      data: {
        projectId: projectId || null,
        uploadedById: userId,
        fileName: safeFileName,
        fileUrl,
        fileSize: file.size,
        mimeType,
        category,
        tags,
        description: description || null,
        driveFileId,
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json(asset, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[assets]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
