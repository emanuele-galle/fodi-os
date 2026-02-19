import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createBankTransferSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { searchParams } = request.nextUrl
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    const where = {
      ...(from || to ? { date: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } } : {}),
    }

    const items = await prisma.bankTransfer.findMany({
      where,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        fromAccount: { select: { id: true, name: true, icon: true } },
        toAccount: { select: { id: true, name: true, icon: true } },
      },
    })

    return NextResponse.json({ success: true, items })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[bank-transfers]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const body = await request.json()
    const parsed = createBankTransferSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors }, { status: 400 })

    const d = parsed.data
    if (d.fromAccountId === d.toAccountId)
      return NextResponse.json({ error: 'Conto origine e destinazione devono essere diversi' }, { status: 400 })

    const transfer = await prisma.bankTransfer.create({
      data: {
        date: new Date(d.date),
        operation: d.operation,
        fromAccountId: d.fromAccountId,
        toAccountId: d.toAccountId,
        amount: d.amount,
        notes: d.notes || null,
      },
    })

    return NextResponse.json({ success: true, data: transfer }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[bank-transfers]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
