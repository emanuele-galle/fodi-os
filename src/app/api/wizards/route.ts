import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { slugify } from '@/lib/utils'
import { createWizardTemplateSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { searchParams } = request.nextUrl
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(status && { status }),
      ...(category && { category }),
    }

    const [items, total] = await Promise.all([
      prisma.wizardTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { steps: true, submissions: true } },
        },
      }),
      prisma.wizardTemplate.count({ where }),
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
    const userId = request.headers.get('x-user-id') || ''
    requirePermission(role, 'erp', 'write')

    const body = await request.json()
    const parsed = createWizardTemplateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, description, category, allowSaveProgress, showProgressBar, completionMessage } = parsed.data
    const slug = slugify(name)

    const existing = await prisma.wizardTemplate.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'Un wizard con questo nome esiste gia' }, { status: 409 })
    }

    const wizard = await prisma.wizardTemplate.create({
      data: {
        name,
        slug,
        description,
        category,
        allowSaveProgress,
        showProgressBar,
        completionMessage,
        creatorId: userId,
      },
      include: {
        _count: { select: { steps: true, submissions: true } },
      },
    })

    return NextResponse.json(wizard, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
