import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import type { Role } from '@/generated/prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')
    const { id } = await params

    const invoice = await prisma.recurringInvoice.findUnique({
      where: { id },
      include: {
        bankAccount: { select: { id: true, name: true, icon: true } },
        businessEntity: { select: { id: true, name: true } },
      },
    })

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Fattura ricorrente non trovata' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: invoice })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[recurring-invoice-get]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')
    const { id } = await params

    const existing = await prisma.recurringInvoice.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Fattura ricorrente non trovata' }, { status: 404 })
    }

    const body = await request.json()
    const data: Record<string, unknown> = {}

    if (body.description !== undefined) data.description = body.description
    if (body.category !== undefined) data.category = body.category
    if (body.supplierName !== undefined) data.supplierName = body.supplierName || null
    if (body.amount !== undefined) data.amount = body.amount
    if (body.frequency !== undefined) data.frequency = body.frequency
    if (body.firstDate !== undefined) data.firstDate = new Date(body.firstDate)
    if (body.lastPaidDate !== undefined) data.lastPaidDate = body.lastPaidDate ? new Date(body.lastPaidDate) : null
    if (body.nextDueDate !== undefined) data.nextDueDate = body.nextDueDate ? new Date(body.nextDueDate) : null
    if (body.totalPaid !== undefined) data.totalPaid = body.totalPaid
    if (body.totalDue !== undefined) data.totalDue = body.totalDue
    if (body.isActive !== undefined) data.isActive = body.isActive
    if (body.notes !== undefined) data.notes = body.notes || null
    if (body.bankAccountId !== undefined) data.bankAccountId = body.bankAccountId || null
    if (body.businessEntityId !== undefined) data.businessEntityId = body.businessEntityId || null

    const updated = await prisma.recurringInvoice.update({ where: { id }, data })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'UPDATE', entityType: 'RECURRING_INVOICE', entityId: id, metadata: { description: updated.description } })

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[recurring-invoice-update]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'delete')
    const { id } = await params

    const existing = await prisma.recurringInvoice.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Fattura ricorrente non trovata' }, { status: 404 })
    }

    await prisma.recurringInvoice.delete({ where: { id } })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'DELETE', entityType: 'RECURRING_INVOICE', entityId: id, metadata: { description: existing.description, amount: String(existing.amount) } })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[recurring-invoice-delete]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
