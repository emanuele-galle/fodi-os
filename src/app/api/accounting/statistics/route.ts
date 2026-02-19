import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { searchParams } = request.nextUrl
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31)

    const [incomes, expenses] = await Promise.all([
      prisma.income.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        select: { date: true, amount: true, netAmount: true, vatAmount: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: startDate, lte: endDate }, isRecurring: false },
        select: { date: true, amount: true, netAmount: true, vatDeductible: true },
      }),
    ])

    // Build monthly stats
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthIncomes = incomes.filter(inc => new Date(inc.date).getMonth() === i)
      const monthExpenses = expenses.filter(exp => new Date(exp.date).getMonth() === i)

      const incomeNet = monthIncomes.reduce((s, inc) => s + Number(inc.netAmount || 0), 0)
      const incomeVat = monthIncomes.reduce((s, inc) => s + Number(inc.vatAmount || 0), 0)
      const expenseNet = monthExpenses.reduce((s, exp) => s + Number(exp.netAmount || 0), 0)
      const expenseVatDeductible = monthExpenses.reduce((s, exp) => s + Number(exp.vatDeductible || 0), 0)

      const profit = incomeNet - expenseNet
      const vatToPayOrRecover = incomeVat - expenseVatDeductible

      return {
        month: i + 1,
        profit: Math.round(profit * 100) / 100,
        incomeNet: Math.round(incomeNet * 100) / 100,
        expenseNet: Math.round(expenseNet * 100) / 100,
        incomeGross: Math.round(monthIncomes.reduce((s, inc) => s + Number(inc.amount), 0) * 100) / 100,
        expenseGross: Math.round(monthExpenses.reduce((s, exp) => s + Number(exp.amount), 0) * 100) / 100,
        vatCollected: Math.round(incomeVat * 100) / 100,
        vatDeductible: Math.round(expenseVatDeductible * 100) / 100,
        vatBalance: Math.round(vatToPayOrRecover * 100) / 100,
      }
    })

    // Running liquidity estimate
    let liquidity = 0
    const monthsWithLiquidity = months.map(m => {
      liquidity += m.profit
      return { ...m, estimatedLiquidity: Math.round(liquidity * 100) / 100 }
    })

    return NextResponse.json({
      success: true,
      data: { year, months: monthsWithLiquidity },
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[accounting-statistics]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
