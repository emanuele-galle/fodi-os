import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createInvoiceSchema } from '@/lib/validation'
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
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, companyName: true } },
          _count: { select: { lineItems: true } },
        },
      }),
      prisma.invoice.count({ where }),
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
    requirePermission(role, 'erp', 'write')

    const userId = request.headers.get('x-user-id')!
    const body = await request.json()
    const parsed = createInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { clientId, projectId, quoteId, title, lineItems: bodyLineItems, taxRate, discount, notes, dueDate } = parsed.data

    // Generate invoice number F-YYYY-NNN
    const year = new Date().getFullYear()
    const lastInvoice = await prisma.invoice.findFirst({
      where: { number: { startsWith: `F-${year}` } },
      orderBy: { number: 'desc' },
    })
    const seq = lastInvoice ? parseInt(lastInvoice.number.split('-')[2]) + 1 : 1
    const number = `F-${year}-${String(seq).padStart(3, '0')}`

    // If quoteId, copy line items from quote
    let itemsToCreate: { description: string; quantity: number; unitPrice: number; total: number; sortOrder: number }[]

    if (quoteId) {
      const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
      })
      if (!quote) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
      }
      itemsToCreate = quote.lineItems.map((item, i) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: parseFloat(String(item.unitPrice)),
        total: parseFloat(String(item.total)),
        sortOrder: i,
      }))
    } else if (bodyLineItems?.length) {
      itemsToCreate = bodyLineItems.map((item: { description: string; quantity: number; unitPrice: number }, i: number) => ({
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice,
        total: (item.quantity || 1) * item.unitPrice,
        sortOrder: i,
      }))
    } else {
      return NextResponse.json({ error: 'lineItems or quoteId is required' }, { status: 400 })
    }

    const subtotal = itemsToCreate.reduce((sum, item) => sum + item.total, 0)
    const discountAmount = discount || 0
    const rate = taxRate ?? 22
    const taxableAmount = subtotal - discountAmount
    const taxAmount = taxableAmount * (rate / 100)
    const total = taxableAmount + taxAmount

    const invoice = await prisma.invoice.create({
      data: {
        clientId,
        projectId,
        creatorId: userId,
        quoteId,
        number,
        title,
        subtotal,
        taxRate: rate,
        taxAmount,
        total,
        discount: discountAmount,
        notes,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        issuedDate: new Date(),
        lineItems: {
          create: itemsToCreate,
        },
      },
      include: {
        client: { select: { id: true, companyName: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    })

    // Mark quote as INVOICED
    if (quoteId) {
      await prisma.quote.update({
        where: { id: quoteId },
        data: { status: 'INVOICED' },
      })
    }

    return NextResponse.json(invoice, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
