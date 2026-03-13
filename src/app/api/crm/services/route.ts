import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { brand } from '@/lib/branding'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const services = await prisma.serviceCatalog.findMany({
      where: { brandSlug: brand.slug },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { clientServices: true } } },
    })
    return NextResponse.json({ success: true, data: services })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'Errore' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const body = await request.json()
    const service = await prisma.serviceCatalog.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description || null,
        category: body.category,
        priceType: body.priceType || 'FIXED',
        priceMin: body.priceMin || null,
        priceMax: body.priceMax || null,
        brandSlug: brand.slug,
        tags: body.tags || [],
        relatedIds: body.relatedIds || [],
        sortOrder: body.sortOrder || 0,
      },
    })
    return NextResponse.json({ success: true, data: service })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'Errore nella creazione' }, { status: 500 })
  }
}
