import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateWikiPageSchema } from '@/lib/validation'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    if (!hasPermission(role, 'kb', 'read')) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

    const { pageId } = await params
    const page = await prisma.wikiPage.findUnique({
      where: { id: pageId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        children: {
          select: { id: true, title: true, slug: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!page) {
      return NextResponse.json({ error: 'Pagina non trovata' }, { status: 404 })
    }

    return NextResponse.json(page)
  } catch (e) {
    console.error('[kb/pageId/GET]', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    if (!hasPermission(role, 'kb', 'write')) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

    const { pageId } = await params
    const body = await request.json()
    const parsed = updateWikiPageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const page = await prisma.wikiPage.update({
      where: { id: pageId },
      data: parsed.data,
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    })

    return NextResponse.json(page)
  } catch (e) {
    console.error('[kb/pageId/PATCH]', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    if (!hasPermission(role, 'kb', 'delete')) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

    const { pageId } = await params
    await prisma.wikiPage.delete({ where: { id: pageId } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[kb/pageId/DELETE]', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
