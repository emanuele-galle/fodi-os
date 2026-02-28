import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { searchParams } = request.nextUrl
    const period = searchParams.get('period') || 'monthly'
    const businessEntityId = searchParams.get('businessEntityId')

    let startDate: Date
    let endDate: Date
    let prevStartDate: Date
    let prevEndDate: Date

    if (period === 'annual') {
      const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
      startDate = new Date(year, 0, 1)
      endDate = new Date(year, 11, 31)
      prevStartDate = new Date(year - 1, 0, 1)
      prevEndDate = new Date(year - 1, 11, 31)
    } else {
      const monthParam = searchParams.get('month') // "2026-01"
      const now = new Date()
      const [y, m] = monthParam ? monthParam.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1]
      startDate = new Date(y, m - 1, 1)
      endDate = new Date(y, m, 0) // last day of month
      const pm = m === 1 ? 12 : m - 1
      const py = m === 1 ? y - 1 : y
      prevStartDate = new Date(py, pm - 1, 1)
      prevEndDate = new Date(py, pm, 0)
    }

    const entityFilter = businessEntityId ? { businessEntityId } : {}

    const [incomes, expenses, prevIncomes, prevExpenses, pendingIncomes] = await Promise.all([
      prisma.income.findMany({
        where: { date: { gte: startDate, lte: endDate }, ...entityFilter },
        select: { category: true, amount: true, netAmount: true, vatAmount: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: startDate, lte: endDate }, isRecurring: false, ...entityFilter },
        select: { category: true, amount: true, netAmount: true, vatDeductible: true },
      }),
      prisma.income.findMany({
        where: { date: { gte: prevStartDate, lte: prevEndDate }, ...entityFilter },
        select: { amount: true, netAmount: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: prevStartDate, lte: prevEndDate }, isRecurring: false, ...entityFilter },
        select: { amount: true, netAmount: true },
      }),
      prisma.income.findMany({
        where: { isPaid: false, date: { gte: startDate, lte: endDate }, ...entityFilter },
        select: { id: true, clientName: true, date: true, amount: true, category: true },
        orderBy: { date: 'asc' },
        take: 20,
      }),
    ])

    // Aggregate by category
    const incomeByCategory: Record<string, { gross: number; net: number; vat: number }> = {}
    let totalIncomeGross = 0, totalIncomeNet = 0, totalIncomeVat = 0
    for (const i of incomes) {
      const cat = i.category
      if (!incomeByCategory[cat]) incomeByCategory[cat] = { gross: 0, net: 0, vat: 0 }
      const g = Number(i.amount); const n = Number(i.netAmount || 0); const v = Number(i.vatAmount || 0)
      incomeByCategory[cat].gross += g; incomeByCategory[cat].net += n; incomeByCategory[cat].vat += v
      totalIncomeGross += g; totalIncomeNet += n; totalIncomeVat += v
    }

    const expenseByCategory: Record<string, { gross: number; net: number; vatDeductible: number }> = {}
    let totalExpenseGross = 0, totalExpenseNet = 0, totalExpenseVatDeductible = 0
    for (const e of expenses) {
      const cat = e.category
      if (!expenseByCategory[cat]) expenseByCategory[cat] = { gross: 0, net: 0, vatDeductible: 0 }
      const g = Number(e.amount); const n = Number(e.netAmount || 0); const vd = Number(e.vatDeductible || 0)
      expenseByCategory[cat].gross += g; expenseByCategory[cat].net += n; expenseByCategory[cat].vatDeductible += vd
      totalExpenseGross += g; totalExpenseNet += n; totalExpenseVatDeductible += vd
    }

    // Previous period totals
    const prevTotalIncomeGross = prevIncomes.reduce((s, i) => s + Number(i.amount), 0)
    const prevTotalExpenseGross = prevExpenses.reduce((s, e) => s + Number(e.amount), 0)

    const profitNet = totalIncomeNet - totalExpenseNet

    const toBreakdown = (obj: Record<string, { gross: number; net: number; vat?: number; vatDeductible?: number }>, total: number) =>
      Object.entries(obj)
        .map(([category, v]) => ({
          category,
          gross: Math.round(v.gross * 100) / 100,
          net: Math.round(v.net * 100) / 100,
          vat: Math.round((v.vat ?? v.vatDeductible ?? 0) * 100) / 100,
          percentage: total > 0 ? Math.round((v.gross / total) * 10000) / 100 : 0,
        }))
        .sort((a, b) => b.gross - a.gross)

    return NextResponse.json({
      success: true,
      data: {
        period,
        income: {
          totalGross: Math.round(totalIncomeGross * 100) / 100,
          totalNet: Math.round(totalIncomeNet * 100) / 100,
          totalVat: Math.round(totalIncomeVat * 100) / 100,
          byCategory: toBreakdown(incomeByCategory, totalIncomeGross),
        },
        expense: {
          totalGross: Math.round(totalExpenseGross * 100) / 100,
          totalNet: Math.round(totalExpenseNet * 100) / 100,
          totalVatDeductible: Math.round(totalExpenseVatDeductible * 100) / 100,
          byCategory: toBreakdown(expenseByCategory, totalExpenseGross),
        },
        profitNet: Math.round(profitNet * 100) / 100,
        comparison: {
          prevIncomeGross: Math.round(prevTotalIncomeGross * 100) / 100,
          prevExpenseGross: Math.round(prevTotalExpenseGross * 100) / 100,
          deltaIncome: Math.round((totalIncomeGross - prevTotalIncomeGross) * 100) / 100,
          deltaExpense: Math.round((totalExpenseGross - prevTotalExpenseGross) * 100) / 100,
        },
        pendingInvoices: pendingIncomes.map(i => ({
          ...i,
          amount: Number(i.amount),
        })),
      },
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[accounting-dashboard]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
