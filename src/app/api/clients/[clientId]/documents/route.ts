import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { uploadToGDrive } from '@/lib/storage'
import type { Role } from '@/generated/prisma/client'

type Params = { params: Promise<{ clientId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { clientId } = await params
    const { searchParams } = request.nextUrl

    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    })

    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente non trovato' }, { status: 404 })
    }

    const [items, total] = await Promise.all([
      prisma.document.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.document.count({ where: { clientId } }),
    ])

    return NextResponse.json({
      success: true,
      items,
      total,
      page,
      limit,
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[clients/:clientId/documents GET]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'crm', 'write')

    const { clientId } = await params

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const category = (formData.get('category') as string) || 'general'

    if (!file) {
      return NextResponse.json({ success: false, error: 'File obbligatorio' }, { status: 400 })
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase()

    // Validate category
    const validCategories = ['contract', 'quote', 'invoice', 'general']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Categoria non valida' },
        { status: 400 }
      )
    }

    // Verify client exists and get company name for GDrive folder
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, companyName: true },
    })

    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente non trovato' }, { status: 404 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const safeFileName = file.name.replace(/[\/\\:*?"<>|]/g, '_')

    // Upload to Google Drive in CRM/{companyName} folder
    const folderName = `CRM/${client.companyName}`
    const { fileId, webViewLink } = await uploadToGDrive(
      safeFileName,
      buffer,
      file.type || 'application/octet-stream',
      folderName
    )

    const document = await prisma.document.create({
      data: {
        clientId,
        name: safeFileName,
        fileUrl: webViewLink,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        category,
        isClientVisible: false,
      },
    })

    logActivity({
      userId,
      action: 'UPLOAD_DOCUMENT',
      entityType: 'CLIENT',
      entityId: clientId,
      metadata: { documentId: document.id, fileName: safeFileName, category },
    })

    return NextResponse.json({ success: true, data: document }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[clients/:clientId/documents POST]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
