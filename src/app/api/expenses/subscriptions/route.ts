import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { createSubscriptionSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const frequency = searchParams.get('frequency')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

    const where = {
      isRecurring: true,
      parentExpenseId: null,
      ...(status && { status }),
      ...(frequency && { frequency }),
    }

    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nextDueDate: 'asc' },
      }),
      prisma.expense.count({ where }),
    ])

    return NextResponse.json({ success: true, data: items, items, total, page, limit })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[subscriptions]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const body = await request.json()
    const parsed = createSubscriptionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { category, description, amount, date, receipt, frequency, nextDueDate, endDate, autoRenew, provider, notes } = parsed.data

    const subscription = await prisma.expense.create({
      data: {
        category,
        description,
        amount,
        date: new Date(date),
        receipt,
        isRecurring: true,
        frequency,
        nextDueDate: new Date(nextDueDate),
        endDate: endDate ? new Date(endDate) : null,
        autoRenew,
        provider: provider || null,
        notes: notes || null,
      },
    })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'CREATE', entityType: 'SUBSCRIPTION', entityId: subscription.id, metadata: { category, amount, frequency, provider: provider || null } })

    return NextResponse.json({ success: true, data: subscription }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[subscriptions]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
