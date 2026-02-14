import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { updateInvoiceSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { invoiceId } = await params

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: { select: { id: true, companyName: true, pec: true, vatNumber: true, sdi: true } },
        project: { select: { id: true, name: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
        quote: { select: { id: true, number: true, title: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const { invoiceId } = await params
    const body = await request.json()
    const parsed = updateInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { title, status, taxRate, discount, notes, dueDate, lineItems, paidAmount, paymentMethod } = parsed.data

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title
    if (notes !== undefined) data.notes = notes
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
    if (paidAmount !== undefined) data.paidAmount = paidAmount
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod

    if (status !== undefined) {
      data.status = status
      if (status === 'PAID') data.paidDate = new Date()
    }

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

      const invoice = await prisma.$transaction(async (tx) => {
        await tx.invoiceLineItem.deleteMany({ where: { invoiceId } })
        await tx.invoiceLineItem.createMany({
          data: itemsWithTotal.map((item: { description: string; quantity: number; unitPrice: number; total: number; sortOrder: number }) => ({ ...item, invoiceId })),
        })
        return tx.invoice.update({
          where: { id: invoiceId },
          data,
          include: {
            client: { select: { id: true, companyName: true } },
            lineItems: { orderBy: { sortOrder: 'asc' } },
          },
        })
      })

      return NextResponse.json(invoice)
    }

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data,
      include: {
        client: { select: { id: true, companyName: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    })

    return NextResponse.json(invoice)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'delete')

    const { invoiceId } = await params

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { status: true } })
    if (!invoice) {
      return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
    }
    if (invoice.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Solo le fatture in bozza possono essere eliminate' }, { status: 400 })
    }

    await prisma.invoice.delete({ where: { id: invoiceId } })

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
