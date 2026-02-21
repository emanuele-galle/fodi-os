import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

interface JournalEntry {
  id: string
  date: string
  type: 'income' | 'expense' | 'transfer'
  invoiceNumber: string | null
  description: string
  debit: number
  credit: number
  account: string | null
  category: string | null
}

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { searchParams } = request.nextUrl
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const type = searchParams.get('type') // income | expense | transfer | null (all)
    const accountId = searchParams.get('accountId')
    const search = searchParams.get('search')
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '200')))

    const dateFilter = from || to
      ? { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) }
      : undefined

    const entries: JournalEntry[] = []

    // Fetch incomes
    if (!type || type === 'income') {
      const incomes = await prisma.income.findMany({
        where: {
          ...(dateFilter && { date: dateFilter }),
          ...(accountId && { bankAccountId: accountId }),
          ...(search && {
            OR: [
              { clientName: { contains: search, mode: 'insensitive' as const } },
              { invoiceNumber: { contains: search, mode: 'insensitive' as const } },
              { notes: { contains: search, mode: 'insensitive' as const } },
            ],
          }),
        },
        include: {
          bankAccount: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
        take: limit,
      })

      for (const i of incomes) {
        entries.push({
          id: `income-${i.id}`,
          date: i.date.toISOString(),
          type: 'income',
          invoiceNumber: i.invoiceNumber,
          description: `${i.clientName} - ${i.category}`,
          debit: 0,
          credit: Number(i.amount),
          account: i.bankAccount?.name || null,
          category: i.category,
        })
      }
    }

    // Fetch expenses
    if (!type || type === 'expense') {
      const expenses = await prisma.expense.findMany({
        where: {
          ...(dateFilter && { date: dateFilter }),
          ...(accountId && { bankAccountId: accountId }),
          ...(search && {
            OR: [
              { description: { contains: search, mode: 'insensitive' as const } },
              { supplierName: { contains: search, mode: 'insensitive' as const } },
              { invoiceNumber: { contains: search, mode: 'insensitive' as const } },
              { notes: { contains: search, mode: 'insensitive' as const } },
            ],
          }),
        },
        include: {
          bankAccount: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
        take: limit,
      })

      for (const e of expenses) {
        entries.push({
          id: `expense-${e.id}`,
          date: e.date.toISOString(),
          type: 'expense',
          invoiceNumber: e.invoiceNumber,
          description: `${e.supplierName || ''} ${e.description}`.trim(),
          debit: Number(e.amount),
          credit: 0,
          account: e.bankAccount?.name || null,
          category: e.category,
        })
      }
    }

    // Fetch transfers
    if (!type || type === 'transfer') {
      const transferWhere = {
        ...(dateFilter && { date: dateFilter }),
        ...(accountId && { OR: [{ fromAccountId: accountId }, { toAccountId: accountId }] }),
        ...(search && {
          OR: [
            { operation: { contains: search, mode: 'insensitive' as const } },
            { notes: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      }

      const transfers = await prisma.bankTransfer.findMany({
        where: transferWhere,
        include: {
          fromAccount: { select: { name: true } },
          toAccount: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
        take: limit,
      })

      for (const t of transfers) {
        entries.push({
          id: `transfer-${t.id}`,
          date: t.date.toISOString(),
          type: 'transfer',
          invoiceNumber: null,
          description: `${t.operation}: ${t.fromAccount.name} → ${t.toAccount.name}`,
          debit: Number(t.amount),
          credit: Number(t.amount),
          account: `${t.fromAccount.name} → ${t.toAccount.name}`,
          category: 'Giroconto',
        })
      }
    }

    // Sort by date descending
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Calculate running balance (from oldest to newest)
    const sorted = [...entries].reverse()
    let balance = 0
    const withBalance = sorted.map((entry) => {
      balance += entry.credit - entry.debit
      return { ...entry, balance }
    })
    withBalance.reverse()

    return NextResponse.json({
      success: true,
      items: withBalance.slice(0, limit),
      total: entries.length,
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[journal]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
