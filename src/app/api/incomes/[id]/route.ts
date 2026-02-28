import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { updateIncomeSchema } from '@/lib/validation'
import { calculateVat } from '@/lib/accounting'
import type { Role } from '@/generated/prisma/client'

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')
    const { id } = await params

    const existing = await prisma.income.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Entrata non trovata' }, { status: 404 })

    const body = await request.json()
    const parsed = updateIncomeSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors }, { status: 400 })

    const d = parsed.data
    const data: Record<string, unknown> = {}
    if (d.isPaid !== undefined) data.isPaid = d.isPaid
    if (d.clientName !== undefined) data.clientName = d.clientName
    if (d.date !== undefined) data.date = new Date(d.date)
    if (d.bankAccountId !== undefined) data.bankAccountId = d.bankAccountId || null
    if (d.businessEntityId !== undefined) data.businessEntityId = d.businessEntityId || null
    if (d.category !== undefined) data.category = d.category
    if (d.vatRate !== undefined) data.vatRate = d.vatRate
    if (d.invoiceNumber !== undefined) data.invoiceNumber = d.invoiceNumber || null
    if (d.dueDate !== undefined) data.dueDate = d.dueDate ? new Date(d.dueDate) : null
    if (d.paymentMethod !== undefined) data.paymentMethod = d.paymentMethod || null
    if (d.notes !== undefined) data.notes = d.notes || null
    if (d.clientId !== undefined) data.clientId = d.clientId || null

    if (d.amount !== undefined || d.vatRate !== undefined) {
      const amt = d.amount ?? Number(existing.amount)
      const rate = d.vatRate ?? existing.vatRate
      const { net, vat } = calculateVat(amt, rate)
      data.amount = amt
      data.netAmount = net
      data.vatAmount = vat
    }

    const updated = await prisma.income.update({ where: { id }, data })

    const userId = request.headers.get('x-user-id')!
    const logMeta = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v === null ? null : String(v)]))
    logActivity({ userId, action: 'UPDATE', entityType: 'INCOME', entityId: id, metadata: logMeta })

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[income-update]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'delete')
    const { id } = await params

    const existing = await prisma.income.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Entrata non trovata' }, { status: 404 })

    await prisma.income.delete({ where: { id } })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'DELETE', entityType: 'INCOME', entityId: id, metadata: { category: existing.category, amount: String(existing.amount) } })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[income-delete]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
