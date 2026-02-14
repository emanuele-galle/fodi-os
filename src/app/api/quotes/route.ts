import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createQuoteSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { searchParams } = request.nextUrl
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where = {
      ...(clientId && { clientId }),
      ...(status && { status: status as never }),
      ...(search && {
        OR: [
          { number: { contains: search, mode: 'insensitive' as const } },
          { title: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [items, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, companyName: true } },
          _count: { select: { lineItems: true } },
        },
      }),
      prisma.quote.count({ where }),
    ])

    return NextResponse.json({ success: true, data: items, items, total, page, limit })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[quotes]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const userId = request.headers.get('x-user-id')!
    const body = await request.json()
    const parsed = createQuoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { clientId, projectId, title, lineItems, taxRate, discount, notes, validUntil } = parsed.data

    // Calculate totals
    const itemsWithTotal = lineItems.map((item: { description: string; quantity: number; unitPrice: number }, i: number) => ({
      description: item.description,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice,
      total: (item.quantity || 1) * item.unitPrice,
      sortOrder: i,
    }))

    const subtotal = itemsWithTotal.reduce((sum: number, item: { total: number }) => sum + item.total, 0)
    const discountAmount = discount || 0
    const rate = taxRate ?? 22
    const taxableAmount = subtotal - discountAmount
    const taxAmount = taxableAmount * (rate / 100)
    const total = taxableAmount + taxAmount

    // Use transaction to avoid race condition on quote number generation
    const quote = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear()
      const lastQuote = await tx.quote.findFirst({
        where: { number: { startsWith: `Q-${year}` } },
        orderBy: { number: 'desc' },
      })
      const seq = lastQuote ? parseInt(lastQuote.number.split('-')[2]) + 1 : 1
      const number = `Q-${year}-${String(seq).padStart(3, '0')}`

      return tx.quote.create({
        data: {
          clientId,
          projectId,
          creatorId: userId,
          number,
          title,
          subtotal,
          taxRate: rate,
          taxAmount,
          total,
          discount: discountAmount,
          notes,
          validUntil: validUntil ? new Date(validUntil) : undefined,
          lineItems: {
            create: itemsWithTotal,
          },
        },
        include: {
          client: { select: { id: true, companyName: true } },
          lineItems: { orderBy: { sortOrder: 'asc' } },
        },
      })
    })

    return NextResponse.json({ success: true, data: quote }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[quotes]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
