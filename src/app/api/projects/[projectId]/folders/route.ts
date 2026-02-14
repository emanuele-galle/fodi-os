import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { slugify } from '@/lib/utils'
import type { Role } from '@/generated/prisma/client'
import { z } from 'zod'

const createFolderSchema = z.object({
  name: z.string().min(1, 'Nome cartella obbligatorio').max(200),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Colore non valido').default('#6366F1'),
})

const updateFolderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const { projectId } = await params

    const folders = await prisma.folder.findMany({
      where: { projectId },
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(folders)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/:projectId/folders]', e)
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
    const parsed = createFolderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const maxOrder = await prisma.folder.aggregate({
      where: { projectId },
      _max: { sortOrder: true },
    })

    const folder = await prisma.folder.create({
      data: {
        projectId,
        name: parsed.data.name,
        description: parsed.data.description,
        color: parsed.data.color,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      include: {
        _count: { select: { tasks: true } },
      },
    })

    // Create a dedicated chat channel for this folder
    await prisma.chatChannel.create({
      data: {
        name: `Chat - ${parsed.data.name}`,
        slug: `folder-${slugify(parsed.data.name)}-${Date.now()}`,
        description: `Chat della cartella ${parsed.data.name}`,
        type: 'PROJECT',
        projectId,
        folderId: folder.id,
        createdById: userId,
        members: {
          create: [{ userId, role: 'OWNER' }],
        },
      },
    })

    return NextResponse.json(folder, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/:projectId/folders]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const { projectId } = await params
    const body = await request.json()
    const parsed = updateFolderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { id, ...data } = parsed.data
    const folder = await prisma.folder.update({
      where: { id, projectId },
      data,
      include: {
        _count: { select: { tasks: true } },
      },
    })

    return NextResponse.json(folder)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/:projectId/folders]', e)
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
      return NextResponse.json({ error: 'ID cartella obbligatorio' }, { status: 400 })
    }

    // Unlink tasks and attachments from folder before deleting
    await prisma.task.updateMany({
      where: { folderId: id },
      data: { folderId: null },
    })
    await prisma.projectAttachment.updateMany({
      where: { folderId: id },
      data: { folderId: null },
    })

    // Archive associated chat channels instead of deleting
    await prisma.chatChannel.updateMany({
      where: { folderId: id },
      data: { isArchived: true, folderId: null },
    })

    await prisma.folder.delete({
      where: { id, projectId },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/:projectId/folders]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
