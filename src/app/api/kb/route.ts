import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createWikiPageSchema } from '@/lib/validation'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    if (!hasPermission(role, 'kb', 'read')) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ]
    }
    if (category) {
      where.category = category
    }

    const [items, total] = await Promise.all([
      prisma.wikiPage.findMany({
        where,
        include: {
          author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.wikiPage.count({ where }),
    ])

    return NextResponse.json({ items, total, page, limit })
  } catch (e) {
    console.error('[kb/GET]', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!

    if (!hasPermission(role, 'kb', 'write')) {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createWikiPageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = parsed.data
    // Auto-generate slug from title if not provided
    let slug = data.slug || data.title
      .toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check slug uniqueness
    const existing = await prisma.wikiPage.findUnique({ where: { slug }, select: { id: true } })
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const page = await prisma.wikiPage.create({
      data: {
        title: data.title,
        slug,
        content: data.content,
        excerpt: data.excerpt,
        category: data.category,
        tags: data.tags,
        isPublished: data.isPublished,
        parentId: data.parentId,
        authorId: userId,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    })

    return NextResponse.json(page, { status: 201 })
  } catch (e) {
    console.error('[kb/POST]', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
