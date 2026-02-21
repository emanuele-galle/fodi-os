import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { createExpenseSchema, expenseAdvancedFields } from '@/lib/validation'
import { calculateVat, calculateDeductibleVat } from '@/lib/accounting'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { searchParams } = request.nextUrl
    const category = searchParams.get('category')
    const clientId = searchParams.get('clientId')
    const projectId = searchParams.get('projectId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit
    const recurring = searchParams.get('recurring')
    const isPaid = searchParams.get('isPaid')
    const bankAccountId = searchParams.get('bankAccountId')
    const businessEntityId = searchParams.get('businessEntityId')

    const where = {
      ...(category && { category }),
      ...(clientId && { clientId }),
      ...(projectId && { projectId }),
      ...(recurring === null ? { isRecurring: false } : recurring === 'true' ? { isRecurring: true } : {}),
      ...(isPaid !== null && isPaid !== '' && { isPaid: isPaid === 'true' }),
      ...(bankAccountId && { bankAccountId }),
      ...(businessEntityId && { businessEntityId }),
      ...(from || to
        ? {
            date: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          client: { select: { id: true, companyName: true } },
          project: { select: { id: true, name: true } },
          bankAccount: { select: { id: true, name: true, icon: true } },
          businessEntity: { select: { id: true, name: true } },
        },
      }),
      prisma.expense.count({ where }),
    ])

    return NextResponse.json({ success: true, data: items, items, total, page, limit })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[expenses]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const body = await request.json()
    const parsed = createExpenseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Parse advanced fields if present
    const advanced = expenseAdvancedFields.safeParse(body)
    const adv = advanced.success ? advanced.data : {}

    const { category, description, amount, date, receipt, clientId, projectId } = parsed.data

    // Calculate VAT if vatRate provided
    let netAmount: number | undefined
    let vatDeductible: number | undefined
    if (adv.vatRate) {
      const { net, vat } = calculateVat(amount, adv.vatRate)
      netAmount = net
      if (adv.deductibility) {
        vatDeductible = calculateDeductibleVat(vat, adv.deductibility)
      }
    }

    const expense = await prisma.expense.create({
      data: {
        category,
        description,
        amount,
        date: new Date(date),
        receipt,
        clientId: clientId || null,
        projectId: projectId || null,
        isPaid: adv.isPaid ?? true,
        supplierName: adv.supplierName || null,
        bankAccountId: adv.bankAccountId || null,
        businessEntityId: adv.businessEntityId || null,
        vatRate: adv.vatRate || null,
        deductibility: adv.deductibility || null,
        netAmount: netAmount ?? null,
        vatDeductible: vatDeductible ?? null,
        invoiceNumber: adv.invoiceNumber || null,
        dueDate: adv.dueDate ? new Date(adv.dueDate) : null,
        paymentMethod: adv.paymentMethod || null,
      },
    })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'CREATE', entityType: 'EXPENSE', entityId: expense.id, metadata: { category, amount } })

    return NextResponse.json({ success: true, data: expense }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[expenses]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
