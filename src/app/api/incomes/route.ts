import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { createIncomeSchema } from '@/lib/validation'
import { calculateVat, generateInvoiceNumber } from '@/lib/accounting'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { searchParams } = request.nextUrl
    const isPaid = searchParams.get('isPaid')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const bankAccountId = searchParams.get('bankAccountId')
    const businessEntityId = searchParams.get('businessEntityId')
    const category = searchParams.get('category')
    const clientName = searchParams.get('clientName')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

    const where = {
      ...(isPaid !== null && isPaid !== '' && { isPaid: isPaid === 'true' }),
      ...(category && { category }),
      ...(bankAccountId && { bankAccountId }),
      ...(businessEntityId && { businessEntityId }),
      ...(clientName && { clientName: { contains: clientName, mode: 'insensitive' as const } }),
      ...(from || to ? { date: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.income.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          bankAccount: { select: { id: true, name: true, icon: true } },
          businessEntity: { select: { id: true, name: true } },
          client: { select: { id: true, companyName: true } },
        },
      }),
      prisma.income.count({ where }),
    ])

    return NextResponse.json({ success: true, items, total, page, limit })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[incomes]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const body = await request.json()
    const parsed = createIncomeSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors }, { status: 400 })

    const d = parsed.data
    const { net, vat } = calculateVat(d.amount, d.vatRate ?? '22')

    // Auto-generate invoice number if not provided
    const invoiceNumber = d.invoiceNumber || await generateInvoiceNumber(prisma)

    const income = await prisma.income.create({
      data: {
        isPaid: d.isPaid ?? false,
        clientName: d.clientName,
        date: new Date(d.date),
        bankAccountId: d.bankAccountId || null,
        businessEntityId: d.businessEntityId || null,
        category: d.category,
        amount: d.amount,
        vatRate: d.vatRate ?? '22',
        netAmount: net,
        vatAmount: vat,
        invoiceNumber,
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
        paymentMethod: d.paymentMethod || null,
        notes: d.notes || null,
        clientId: d.clientId || null,
      },
    })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'CREATE', entityType: 'INCOME', entityId: income.id, metadata: { category: d.category, amount: d.amount } })

    return NextResponse.json({ success: true, data: income }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[incomes]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
