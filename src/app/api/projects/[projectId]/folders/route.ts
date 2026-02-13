import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
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
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
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

    return NextResponse.json(folder, { status: 201 })
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
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID cartella obbligatorio' }, { status: 400 })
    }

    // Unlink tasks from folder before deleting
    await prisma.task.updateMany({
      where: { folderId: id },
      data: { folderId: null },
    })

    await prisma.folder.delete({
      where: { id, projectId },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
