import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { searchParams } = request.nextUrl
    const isActive = searchParams.get('isActive')
    const frequency = searchParams.get('frequency')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

    const where = {
      ...(isActive !== null && isActive !== '' && { isActive: isActive === 'true' }),
      ...(frequency && { frequency }),
    }

    const [items, total] = await Promise.all([
      prisma.recurringInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nextDueDate: 'asc' },
        include: {
          bankAccount: { select: { id: true, name: true, icon: true } },
          businessEntity: { select: { id: true, name: true } },
        },
      }),
      prisma.recurringInvoice.count({ where }),
    ])

    return NextResponse.json({ success: true, items, total, page, limit })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[recurring-invoices]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const body = await request.json()
    const { description, category, supplierName, amount, frequency, firstDate, lastPaidDate, nextDueDate, totalPaid, totalDue, isActive, notes, bankAccountId, businessEntityId } = body

    if (!description || !category || !amount || !frequency || !firstDate) {
      return NextResponse.json({ success: false, error: 'description, category, amount, frequency e firstDate sono obbligatori' }, { status: 400 })
    }

    const invoice = await prisma.recurringInvoice.create({
      data: {
        description,
        category,
        supplierName: supplierName || null,
        amount,
        frequency,
        firstDate: new Date(firstDate),
        lastPaidDate: lastPaidDate ? new Date(lastPaidDate) : null,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        totalPaid: totalPaid || 0,
        totalDue: totalDue || 0,
        isActive: isActive !== false,
        notes: notes || null,
        bankAccountId: bankAccountId || null,
        businessEntityId: businessEntityId || null,
      },
    })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'CREATE', entityType: 'RECURRING_INVOICE', entityId: invoice.id, metadata: { description, amount } })

    return NextResponse.json({ success: true, data: invoice }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[recurring-invoices]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
