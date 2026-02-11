import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { deleteFile } from '@/lib/s3'
import { updateAssetSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'content', 'read')

    const { assetId } = await params

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            comments: {
              orderBy: { createdAt: 'asc' },
              include: { author: { select: { id: true, firstName: true, lastName: true } } },
            },
          },
        },
      },
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset non trovato' }, { status: 404 })
    }

    return NextResponse.json(asset)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'content', 'write')

    const { assetId } = await params
    const body = await request.json()
    const parsed = updateAssetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { tags, category, description } = parsed.data

    const asset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        ...(tags !== undefined && { tags }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
      },
    })

    return NextResponse.json(asset)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'content', 'delete')

    const { assetId } = await params

    const asset = await prisma.asset.findUnique({ where: { id: assetId } })
    if (!asset) {
      return NextResponse.json({ error: 'Asset non trovato' }, { status: 404 })
    }

    // Try to delete from S3 if the URL contains a key
    try {
      const url = new URL(asset.fileUrl)
      const key = url.pathname.replace(/^\/[^/]+\//, '') // Remove bucket prefix
      if (key) await deleteFile(key)
    } catch {
      // S3 deletion is best-effort
    }

    await prisma.asset.delete({ where: { id: assetId } })

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
