import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { slugify } from '@/lib/utils'
import { updateWikiPageSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'kb', 'read')

    const { pageId } = await params

    const page = await prisma.wikiPage.findUnique({
      where: { id: pageId },
      include: {
        children: {
          orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
          select: { id: true, title: true, slug: true, icon: true, category: true, isPublished: true },
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 5,
          include: { editor: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    })

    if (!page) {
      return NextResponse.json({ success: false, error: 'Pagina non trovata' }, { status: 404 })
    }

    // Build breadcrumb by collecting ancestor IDs iteratively (max 10 levels)
    const breadcrumb: { id: string; title: string; slug: string }[] = []
    if (page.parentId) {
      // Load all wiki pages' parent relationships in one query to avoid N+1
      const allPages = await prisma.wikiPage.findMany({
        select: { id: true, title: true, slug: true, parentId: true },
      })
      const pageMap = new Map(allPages.map((p) => [p.id, p]))

      let currentParentId: string | null = page.parentId
      let depth = 0
      while (currentParentId && depth < 10) {
        const parent = pageMap.get(currentParentId)
        if (!parent) break
        breadcrumb.unshift({ id: parent.id, title: parent.title, slug: parent.slug })
        currentParentId = parent.parentId
        depth++
      }
    }

    return NextResponse.json({ success: true, data: { ...page, breadcrumb } })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[wiki]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'kb', 'write')

    const { pageId } = await params
    const body = await request.json()
    const parsed = updateWikiPageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { title, content, contentText, category, icon, isPublished, changeNote } = parsed.data

    const existing = await prisma.wikiPage.findUnique({ where: { id: pageId } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Pagina non trovata' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (title !== undefined) {
      data.title = title
      data.slug = slugify(title)
    }
    if (content !== undefined) data.content = content
    if (contentText !== undefined) data.contentText = contentText
    if (category !== undefined) data.category = category
    if (icon !== undefined) data.icon = icon
    if (isPublished !== undefined) data.isPublished = isPublished

    const page = await prisma.wikiPage.update({
      where: { id: pageId },
      data,
    })

    // Create new version if content changed
    if (content !== undefined) {
      const latestVersion = await prisma.wikiPageVersion.findFirst({
        where: { pageId },
        orderBy: { version: 'desc' },
      })

      await prisma.wikiPageVersion.create({
        data: {
          pageId,
          editorId: userId,
          content,
          version: (latestVersion?.version || 0) + 1,
          changeNote: changeNote || null,
        },
      })
    }

    return NextResponse.json({ success: true, data: page })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[wiki]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'kb', 'write')

    const { pageId } = await params

    // Delete recursively: children first (cascade via Prisma)
    // Since WikiPage has onDelete: Cascade on versions, we just need to handle children manually
    async function deleteRecursive(id: string) {
      const children = await prisma.wikiPage.findMany({
        where: { parentId: id },
        select: { id: true },
      })
      for (const child of children) {
        await deleteRecursive(child.id)
      }
      await prisma.wikiPage.delete({ where: { id } })
    }

    await deleteRecursive(pageId)

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[wiki]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
