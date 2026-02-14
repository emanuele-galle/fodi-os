import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createQuoteFromTemplateSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const userId = request.headers.get('x-user-id')!
    const body = await request.json()
    const parsed = createQuoteFromTemplateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { templateId, clientId, projectId, title, lineItems: overrideItems, taxRate, discount, notes, validUntil } = parsed.data

    // Fetch template with line items
    const template = await prisma.quoteTemplate.findUnique({
      where: { id: templateId },
      include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!template) {
      return NextResponse.json({ error: 'Template non trovato' }, { status: 404 })
    }

    // Use override items or template items
    const items = overrideItems?.length
      ? overrideItems.map((item, i) => ({
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice,
          total: (item.quantity || 1) * item.unitPrice,
          sortOrder: i,
        }))
      : template.lineItems.map((item, i) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: parseFloat(String(item.unitPrice)),
          total: item.quantity * parseFloat(String(item.unitPrice)),
          sortOrder: item.sortOrder ?? i,
        }))

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const rate = taxRate ?? parseFloat(String(template.defaultTaxRate))
    const discountAmount = discount ?? parseFloat(String(template.defaultDiscount))
    const taxableAmount = subtotal - discountAmount
    const taxAmount = taxableAmount * (rate / 100)
    const total = taxableAmount + taxAmount

    // Generate quote number using template format
    const year = new Date().getFullYear()
    const prefix = template.numberPrefix
    const lastQuote = await prisma.quote.findFirst({
      where: { number: { startsWith: `${prefix}-${year}` } },
      orderBy: { number: 'desc' },
    })
    const seq = lastQuote ? parseInt(lastQuote.number.split('-')[2]) + 1 : 1
    const number = template.numberFormat
      .replace('{PREFIX}', prefix)
      .replace('{YYYY}', String(year))
      .replace('{NNN}', String(seq).padStart(3, '0'))

    // Determine validUntil
    const validDate = validUntil
      ? new Date(validUntil)
      : new Date(Date.now() + template.defaultValidDays * 24 * 60 * 60 * 1000)

    const quote = await prisma.quote.create({
      data: {
        clientId,
        projectId,
        creatorId: userId,
        templateId,
        number,
        title,
        subtotal,
        taxRate: rate,
        taxAmount,
        total,
        discount: discountAmount,
        notes: notes ?? template.defaultNotes ?? undefined,
        validUntil: validDate,
        lineItems: {
          create: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: {
        client: { select: { id: true, companyName: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    })

    return NextResponse.json(quote, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
