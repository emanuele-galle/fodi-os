import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { slugify } from '@/lib/utils'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { searchParams } = request.nextUrl
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where = {
      ...(search && {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' as const } },
          { vatNumber: { contains: search, mode: 'insensitive' as const } },
          { pec: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(status && { status: status as never }),
    }

    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { contacts: true, projects: true, quotes: true } },
        },
      }),
      prisma.client.count({ where }),
    ])

    return NextResponse.json({ items, total, page, limit })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const body = await request.json()
    const { companyName, vatNumber, pec, sdi, website, industry, source, status, notes, tags } = body

    if (!companyName) {
      return NextResponse.json({ error: 'companyName is required' }, { status: 400 })
    }

    const slug = slugify(companyName)

    const existing = await prisma.client.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'A client with this name already exists' }, { status: 409 })
    }

    const client = await prisma.client.create({
      data: {
        companyName,
        slug,
        vatNumber,
        pec,
        sdi,
        website,
        industry,
        source,
        status,
        notes,
        tags: tags || [],
      },
      include: {
        _count: { select: { contacts: true, projects: true, quotes: true } },
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
