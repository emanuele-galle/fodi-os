import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createQuoteTemplateSchema } from '@/lib/validation'
import { slugify } from '@/lib/utils'
import { Prisma } from '@/generated/prisma/client'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { searchParams } = request.nextUrl
    const search = searchParams.get('search') || ''
    const activeOnly = searchParams.get('active') !== 'false'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where = {
      ...(activeOnly && { isActive: true }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [items, total] = await Promise.all([
      prisma.quoteTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, companyName: true } },
          _count: { select: { lineItems: true, quotes: true } },
        },
      }),
      prisma.quoteTemplate.count({ where }),
    ])

    return NextResponse.json({ items, total, page, limit })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const userId = request.headers.get('x-user-id')!
    const body = await request.json()
    const parsed = createQuoteTemplateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { lineItems, clientId, sections, ...templateData } = parsed.data

    // Generate unique slug
    let slug = slugify(templateData.name)
    const existing = await prisma.quoteTemplate.findUnique({ where: { slug } })
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const template = await prisma.quoteTemplate.create({
      data: {
        ...templateData,
        slug,
        creatorId: userId,
        clientId: clientId || null,
        sections: sections === null ? Prisma.JsonNull : sections ?? Prisma.JsonNull,
        lineItems: lineItems?.length
          ? { create: lineItems.map((item, i) => ({ ...item, sortOrder: item.sortOrder ?? i })) }
          : undefined,
      },
      include: {
        client: { select: { id: true, companyName: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
