import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { updateQuoteSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ quoteId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { quoteId } = await params

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        client: { select: { id: true, companyName: true, pec: true, vatNumber: true } },
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404 })
    }

    return NextResponse.json(quote)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ quoteId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const { quoteId } = await params
    const body = await request.json()
    const parsed = updateQuoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { title, status, taxRate, discount, notes, validUntil, lineItems, projectId } = parsed.data

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title
    if (status !== undefined) data.status = status
    if (notes !== undefined) data.notes = notes
    if (projectId !== undefined) data.projectId = projectId
    if (validUntil !== undefined) data.validUntil = validUntil ? new Date(validUntil) : null

    // If lineItems provided, recalculate totals
    if (lineItems) {
      const itemsWithTotal = lineItems.map((item: { description: string; quantity: number; unitPrice: number }, i: number) => ({
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice,
        total: (item.quantity || 1) * item.unitPrice,
        sortOrder: i,
      }))

      const subtotal = itemsWithTotal.reduce((sum: number, item: { total: number }) => sum + item.total, 0)
      const discountAmount = discount ?? 0
      const rate = taxRate ?? 22
      const taxableAmount = subtotal - discountAmount
      const taxAmount = taxableAmount * (rate / 100)
      const total = taxableAmount + taxAmount

      data.subtotal = subtotal
      data.taxRate = rate
      data.taxAmount = taxAmount
      data.total = total
      data.discount = discountAmount

      // Replace strategy in transaction: delete old, insert new, update quote
      const quote = await prisma.$transaction(async (tx) => {
        await tx.quoteLineItem.deleteMany({ where: { quoteId } })
        await tx.quoteLineItem.createMany({
          data: itemsWithTotal.map((item: { description: string; quantity: number; unitPrice: number; total: number; sortOrder: number }) => ({ ...item, quoteId })),
        })
        return tx.quote.update({
          where: { id: quoteId },
          data,
          include: {
            client: { select: { id: true, companyName: true } },
            lineItems: { orderBy: { sortOrder: 'asc' } },
          },
        })
      })

      return NextResponse.json(quote)
    } else if (taxRate !== undefined || discount !== undefined) {
      // Recalculate with existing line items
      const existing = await prisma.quote.findUnique({ where: { id: quoteId }, select: { subtotal: true, taxRate: true, discount: true } })
      if (existing) {
        const sub = parseFloat(String(existing.subtotal))
        const disc = discount !== undefined ? discount : parseFloat(String(existing.discount))
        const rate = taxRate !== undefined ? taxRate : parseFloat(String(existing.taxRate))
        const taxable = sub - disc
        data.taxRate = rate
        data.discount = disc
        data.taxAmount = taxable * (rate / 100)
        data.total = taxable + taxable * (rate / 100)
      }
    }

    const quote = await prisma.quote.update({
      where: { id: quoteId },
      data,
      include: {
        client: { select: { id: true, companyName: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    })

    return NextResponse.json(quote)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ quoteId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'delete')

    const { quoteId } = await params

    const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { status: true } })
    if (!quote) {
      return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404 })
    }
    if (quote.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Solo i preventivi in bozza possono essere eliminati' }, { status: 400 })
    }

    await prisma.quote.delete({ where: { id: quoteId } })

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
