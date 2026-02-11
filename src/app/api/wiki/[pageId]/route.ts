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
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Build breadcrumb (parent chain)
    const breadcrumb: { id: string; title: string; slug: string }[] = []
    let currentParentId = page.parentId
    while (currentParentId) {
      const parent = await prisma.wikiPage.findUnique({
        where: { id: currentParentId },
        select: { id: true, title: true, slug: true, parentId: true },
      })
      if (!parent) break
      breadcrumb.unshift(parent)
      currentParentId = parent.parentId
    }

    return NextResponse.json({ ...page, breadcrumb })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
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
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { title, content, contentText, category, icon, isPublished, changeNote } = parsed.data

    const existing = await prisma.wikiPage.findUnique({ where: { id: pageId } })
    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
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

    return NextResponse.json(page)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
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
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
