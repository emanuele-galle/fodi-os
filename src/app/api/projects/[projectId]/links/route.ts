import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'
import { z } from 'zod'

const createLinkSchema = z.object({
  title: z.string().min(1, 'Titolo obbligatorio').max(500),
  url: z.string().min(1, 'URL obbligatorio').max(2000),
  description: z.string().max(5000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  folderId: z.string().uuid().optional().nullable(),
})

const updateLinkSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  url: z.string().min(1).max(2000).optional(),
  description: z.string().max(5000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const { projectId } = await params
    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')
    const tag = searchParams.get('tag')
    const folderId = searchParams.get('folderId')

    const where: Record<string, unknown> = { projectId }
    if (folderId) {
      where.folderId = folderId
    } else if (searchParams.has('folderId')) {
      // folderId param present but empty → root-level links only
      where.folderId = null
    }
    if (search && search.trim().length >= 2) {
      where.title = { contains: search.trim(), mode: 'insensitive' }
    }
    if (tag) {
      where.tags = { has: tag }
    }

    const links = await prisma.projectLink.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json({ items: links, total: links.length })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/:projectId/links/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const userId = request.headers.get('x-user-id')!
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const { projectId } = await params
    const body = await request.json()
    const parsed = createLinkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const link = await prisma.projectLink.create({
      data: {
        projectId,
        folderId: parsed.data.folderId || null,
        creatorId: userId,
        title: parsed.data.title,
        url: parsed.data.url,
        description: parsed.data.description || null,
        tags: parsed.data.tags,
      },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json(link, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/:projectId/links/POST]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const { projectId } = await params
    const body = await request.json()
    const parsed = updateLinkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { id, ...data } = parsed.data

    const link = await prisma.projectLink.update({
      where: { id, projectId },
      data: { ...data, updatedAt: new Date() },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json(link)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/:projectId/links/PATCH]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const { projectId } = await params
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID collegamento obbligatorio' }, { status: 400 })
    }

    await prisma.projectLink.delete({
      where: { id, projectId },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/:projectId/links/DELETE]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
