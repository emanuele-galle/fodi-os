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
  parentId: z.string().uuid('Parent ID non valido').optional(),
})

const updateFolderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  sortOrder: z.number().int().min(0).optional(),
  parentId: z.string().uuid('Parent ID non valido').optional().nullable(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const { projectId } = await params

    const folders = await prisma.folder.findMany({
      where: { projectId, parentId: null },
      include: {
        _count: { select: { tasks: true } },
        children: {
          include: {
            _count: { select: { tasks: true } },
            children: {
              include: {
                _count: { select: { tasks: true } },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
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

    // Validate parentId belongs to same project and enforce max 2 levels
    if (parsed.data.parentId) {
      const parent = await prisma.folder.findUnique({
        where: { id: parsed.data.parentId },
        select: { projectId: true, parentId: true },
      })
      if (!parent || parent.projectId !== projectId) {
        return NextResponse.json({ error: 'Cartella parent non trovata o non appartiene al progetto' }, { status: 400 })
      }
      if (parent.parentId) {
        return NextResponse.json({ error: 'Massimo 2 livelli di profondità consentiti' }, { status: 400 })
      }
    }

    const maxOrder = await prisma.folder.aggregate({
      where: { projectId, parentId: parsed.data.parentId || null },
      _max: { sortOrder: true },
    })

    const folder = await prisma.folder.create({
      data: {
        projectId,
        parentId: parsed.data.parentId || null,
        name: parsed.data.name,
        description: parsed.data.description,
        color: parsed.data.color,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      include: {
        _count: { select: { tasks: true } },
        children: {
          include: {
            _count: { select: { tasks: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
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

    const { id, parentId, ...data } = parsed.data

    // Validate parentId if provided
    if (parentId !== undefined) {
      if (parentId === id) {
        return NextResponse.json({ error: 'Una cartella non può essere sottocartella di se stessa' }, { status: 400 })
      }
      if (parentId !== null) {
        const parent = await prisma.folder.findUnique({
          where: { id: parentId },
          select: { projectId: true, parentId: true },
        })
        if (!parent || parent.projectId !== projectId) {
          return NextResponse.json({ error: 'Cartella parent non trovata o non appartiene al progetto' }, { status: 400 })
        }
        if (parent.parentId) {
          return NextResponse.json({ error: 'Massimo 2 livelli di profondità consentiti' }, { status: 400 })
        }
      }
      (data as Record<string, unknown>).parentId = parentId
    }

    const folder = await prisma.folder.update({
      where: { id, projectId },
      data,
      include: {
        _count: { select: { tasks: true } },
        children: {
          include: {
            _count: { select: { tasks: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
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

// PUT /api/projects/:projectId/folders - Batch reorder / reparent folders
export async function PUT(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const { projectId } = await params
    const body = await request.json()

    const schema = z.object({
      items: z.array(z.object({
        id: z.string().uuid(),
        parentId: z.string().uuid().nullable(),
        sortOrder: z.number().int().min(0),
      })),
    })

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Validate all folders belong to this project
    const folderIds = parsed.data.items.map((i) => i.id)
    const existing = await prisma.folder.findMany({
      where: { id: { in: folderIds }, projectId },
      select: { id: true },
    })
    if (existing.length !== folderIds.length) {
      return NextResponse.json({ error: 'Alcune cartelle non appartengono a questo progetto' }, { status: 400 })
    }

    // Validate no folder is parent of itself and max 2 levels
    for (const item of parsed.data.items) {
      if (item.parentId === item.id) {
        return NextResponse.json({ error: 'Una cartella non può essere sottocartella di se stessa' }, { status: 400 })
      }
      if (item.parentId) {
        const parentItem = parsed.data.items.find((i) => i.id === item.parentId)
        if (parentItem && parentItem.parentId !== null) {
          return NextResponse.json({ error: 'Massimo 2 livelli di profondità consentiti' }, { status: 400 })
        }
      }
    }

    // Batch update in a transaction
    await prisma.$transaction(
      parsed.data.items.map((item) =>
        prisma.folder.update({
          where: { id: item.id, projectId },
          data: { parentId: item.parentId, sortOrder: item.sortOrder },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[projects/:projectId/folders/PUT]', e)
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

    // Get all child folder IDs
    const children = await prisma.folder.findMany({
      where: { parentId: id },
      select: { id: true },
    })
    const allFolderIds = [id, ...children.map((c) => c.id)]

    // Unlink tasks and attachments from folder and children before deleting
    await prisma.task.updateMany({
      where: { folderId: { in: allFolderIds } },
      data: { folderId: null },
    })
    await prisma.projectAttachment.updateMany({
      where: { folderId: { in: allFolderIds } },
      data: { folderId: null },
    })

    // Archive associated chat channels instead of deleting
    await prisma.chatChannel.updateMany({
      where: { folderId: { in: allFolderIds } },
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
