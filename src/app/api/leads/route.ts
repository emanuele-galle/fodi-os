import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'
import type { Role } from '@/generated/prisma/client'

const createLeadSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio').max(200, 'Nome troppo lungo'),
  email: z.string().email('Email non valida'),
  message: z.string().min(1, 'Messaggio obbligatorio'),
  company: z.string().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  service: z.string().max(200).optional().nullable(),
  source: z.string().max(100).optional(),
})

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

    const assigneeId = searchParams.get('assigneeId')

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { company: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(status && { status }),
      ...(assigneeId && { assigneeId }),
    }

    const [items, total, statusCountsRaw] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
          convertedClient: { select: { id: true, companyName: true } },
        },
      }),
      prisma.lead.count({ where }),
      prisma.lead.groupBy({ by: ['status'], _count: true }),
    ])

    const statusCounts: Record<string, number> = {}
    for (const row of statusCountsRaw) {
      statusCounts[row.status] = row._count
    }

    return NextResponse.json({ success: true, data: items, items, total, page, limit, statusCounts })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[leads]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (!rateLimit(`leads:${ip}`, 10, 60000)) {
      return NextResponse.json({ error: 'Troppi tentativi. Riprova tra un minuto.' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = createLeadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, email, company, phone, service, message, source } = parsed.data

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        company: company || null,
        phone: phone || null,
        service: service || null,
        message,
        source: source || 'website',
      },
    })

    return NextResponse.json({ success: true, data: lead }, { status: 201 })
  } catch (e) {
    console.error('[leads/POST]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
