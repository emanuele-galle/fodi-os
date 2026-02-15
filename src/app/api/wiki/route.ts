import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { slugify } from '@/lib/utils'
import { createWikiPageSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'kb', 'read')

    const { searchParams } = request.nextUrl
    const parentId = searchParams.get('parentId')
    const hasParentIdParam = searchParams.has('parentId')
    const category = searchParams.get('category')
    const search = searchParams.get('search') || ''

    const where = {
      ...(hasParentIdParam ? { parentId: parentId || null } : {}),
      ...(category && { category }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { contentText: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const items = await prisma.wikiPage.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: {
        _count: { select: { children: true, versions: true } },
      },
    })

    return NextResponse.json({ success: true, data: items, items, total: items.length })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[wiki]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'kb', 'write')

    const body = await request.json()
    const parsed = createWikiPageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { parentId, title, content, contentText, category, icon, workspaceId, coverUrl } = parsed.data

    const slug = slugify(title)

    const existing = await prisma.wikiPage.findFirst({
      where: { parentId: parentId || null, slug },
    })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Una pagina con questo titolo esiste gia a questo livello' }, { status: 409 })
    }

    const page = await prisma.wikiPage.create({
      data: {
        parentId: parentId || null,
        workspaceId: workspaceId || null,
        title,
        slug,
        content: content || null,
        contentText: contentText || null,
        category: category || 'general',
        icon: icon || null,
        coverUrl: coverUrl || null,
      },
    })

    // Create initial version
    await prisma.wikiPageVersion.create({
      data: {
        pageId: page.id,
        editorId: userId,
        content: content || null,
        version: 1,
        changeNote: 'Versione iniziale',
      },
    })

    return NextResponse.json({ success: true, data: page }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[wiki]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
