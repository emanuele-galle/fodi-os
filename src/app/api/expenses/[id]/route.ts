import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { updateExpenseSchema, expenseAdvancedFields } from '@/lib/validation'
import { calculateVat, calculateDeductibleVat } from '@/lib/accounting'
import type { Role } from '@/generated/prisma/client'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')
    const { id } = await params

    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Spesa non trovata' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateExpenseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const advanced = expenseAdvancedFields.safeParse(body)
    const adv = advanced.success ? advanced.data : {}

    const data: Record<string, unknown> = {}
    const d = parsed.data
    if (d.category !== undefined) data.category = d.category
    if (d.description !== undefined) data.description = d.description
    if (d.amount !== undefined) data.amount = d.amount
    if (d.date !== undefined) data.date = new Date(d.date)
    if (d.receipt !== undefined) data.receipt = d.receipt
    if (d.clientId !== undefined) data.clientId = d.clientId || null
    if (d.projectId !== undefined) data.projectId = d.projectId || null

    // Advanced accounting fields
    if (adv.isPaid !== undefined) data.isPaid = adv.isPaid
    if (adv.supplierName !== undefined) data.supplierName = adv.supplierName || null
    if (adv.bankAccountId !== undefined) data.bankAccountId = adv.bankAccountId || null
    if (adv.businessEntityId !== undefined) data.businessEntityId = adv.businessEntityId || null
    if (adv.vatRate !== undefined) data.vatRate = adv.vatRate || null
    if (adv.deductibility !== undefined) data.deductibility = adv.deductibility || null

    // Recalculate VAT if relevant fields changed
    const amt = (d.amount ?? Number(existing.amount)) as number
    const vr = adv.vatRate !== undefined ? adv.vatRate : existing.vatRate
    const ded = adv.deductibility !== undefined ? adv.deductibility : existing.deductibility
    if (vr) {
      const { net, vat } = calculateVat(amt, vr)
      data.netAmount = net
      data.vatDeductible = ded ? calculateDeductibleVat(vat, ded) : null
    }

    const updated = await prisma.expense.update({ where: { id }, data })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'UPDATE', entityType: 'EXPENSE', entityId: id, metadata: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v === null ? null : String(v)])) })

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[expense-update]', e)
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

    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Spesa non trovata' }, { status: 404 })
    }

    await prisma.expense.delete({ where: { id } })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'DELETE', entityType: 'EXPENSE', entityId: id, metadata: { category: existing.category, amount: String(existing.amount) } })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[expense-delete]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
