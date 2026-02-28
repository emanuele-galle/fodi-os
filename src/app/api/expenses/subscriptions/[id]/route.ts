import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { updateSubscriptionSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')
    const { id } = await params

    const subscription = await prisma.expense.findUnique({
      where: { id },
      include: { childExpenses: { orderBy: { date: 'desc' }, take: 20 } },
    })
    if (!subscription || !subscription.isRecurring) {
      return NextResponse.json({ success: false, error: 'Abbonamento non trovato' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: subscription })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[subscription-detail]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')
    const { id } = await params

    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing || !existing.isRecurring) {
      return NextResponse.json({ success: false, error: 'Abbonamento non trovato' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateSubscriptionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    const d = parsed.data
    if (d.category !== undefined) data.category = d.category
    if (d.description !== undefined) data.description = d.description
    if (d.amount !== undefined) data.amount = d.amount
    if (d.date !== undefined) data.date = new Date(d.date)
    if (d.receipt !== undefined) data.receipt = d.receipt
    if (d.frequency !== undefined) data.frequency = d.frequency
    if (d.nextDueDate !== undefined) data.nextDueDate = new Date(d.nextDueDate)
    if (d.endDate !== undefined) data.endDate = d.endDate ? new Date(d.endDate) : null
    if (d.autoRenew !== undefined) data.autoRenew = d.autoRenew
    if (d.status !== undefined) data.status = d.status
    if (d.provider !== undefined) data.provider = d.provider
    if (d.notes !== undefined) data.notes = d.notes

    const updated = await prisma.expense.update({ where: { id }, data })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'UPDATE', entityType: 'SUBSCRIPTION', entityId: id, metadata: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v === null ? null : String(v)])) })

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[subscription-update]', e)
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
    if (!existing || !existing.isRecurring) {
      return NextResponse.json({ success: false, error: 'Abbonamento non trovato' }, { status: 404 })
    }

    const { searchParams } = request.nextUrl
    const permanent = searchParams.get('permanent') === 'true'

    if (permanent) {
      await prisma.expense.deleteMany({ where: { parentExpenseId: id } })
      await prisma.expense.delete({ where: { id } })
    } else {
      await prisma.expense.update({
        where: { id },
        data: { status: 'cancelled' },
      })
    }

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'DELETE', entityType: 'SUBSCRIPTION', entityId: id, metadata: { permanent: permanent ? 'true' : 'false' } })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[subscription-delete]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
