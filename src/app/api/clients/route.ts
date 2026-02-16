import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { slugify } from '@/lib/utils'
import { createClientSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { searchParams } = request.nextUrl
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const industry = searchParams.get('industry')
    const source = searchParams.get('source')
    const tags = searchParams.get('tags')
    const revenueMin = searchParams.get('revenueMin')
    const revenueMax = searchParams.get('revenueMax')
    const createdAfter = searchParams.get('createdAfter')
    const createdBefore = searchParams.get('createdBefore')
    const neglected = searchParams.get('neglected')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const AND: Record<string, unknown>[] = []

    if (search) {
      AND.push({
        OR: [
          { companyName: { contains: search, mode: 'insensitive' as const } },
          { vatNumber: { contains: search, mode: 'insensitive' as const } },
          { pec: { contains: search, mode: 'insensitive' as const } },
          { contacts: { some: { email: { contains: search, mode: 'insensitive' as const } } } },
          { contacts: { some: { firstName: { contains: search, mode: 'insensitive' as const } } } },
          { contacts: { some: { lastName: { contains: search, mode: 'insensitive' as const } } } },
          { contacts: { some: { phone: { contains: search, mode: 'insensitive' as const } } } },
        ],
      })
    }

    if (status) AND.push({ status: status as never })
    if (industry) AND.push({ industry: { in: industry.split(',') } })
    if (source) AND.push({ source: { in: source.split(',') } })
    if (tags) AND.push({ tags: { hasSome: tags.split(',') } })
    if (revenueMin) AND.push({ totalRevenue: { gte: parseFloat(revenueMin) } })
    if (revenueMax) AND.push({ totalRevenue: { lte: parseFloat(revenueMax) } })
    if (createdAfter) AND.push({ createdAt: { gte: new Date(createdAfter) } })
    if (createdBefore) AND.push({ createdAt: { lte: new Date(createdBefore) } })
    if (neglected === 'true') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      AND.push({ status: 'ACTIVE' as never })
      AND.push({
        OR: [
          { interactions: { none: {} } },
          { interactions: { every: { date: { lt: thirtyDaysAgo } } } },
        ],
      })
    }

    const where = AND.length > 0 ? { AND } : {}

    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { contacts: true, projects: true, quotes: true } },
          interactions: { take: 1, orderBy: { date: 'desc' }, select: { date: true, type: true } },
        },
      }),
      prisma.client.count({ where }),
    ])

    return NextResponse.json({ success: true, data: items, items, total, page, limit })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[clients/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const body = await request.json()
    const parsed = createClientSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { companyName, vatNumber, pec, sdi, website, industry, source, status, notes, tags } = parsed.data

    const slug = slugify(companyName)

    const existing = await prisma.client.findUnique({ where: { slug }, select: { id: true } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Un cliente con questo nome esiste gia' }, { status: 409 })
    }

    const userId = request.headers.get('x-user-id')!

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

    logActivity({ userId, action: 'CREATE', entityType: 'CLIENT', entityId: client.id, metadata: { companyName } })

    return NextResponse.json({ success: true, data: client }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[clients/POST]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
