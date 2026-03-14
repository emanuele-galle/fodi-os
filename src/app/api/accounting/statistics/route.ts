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

    // Aggregate at DB level to avoid loading all rows into memory
    const [incomeByMonth, expenseByMonth] = await Promise.all([
      prisma.$queryRaw<Array<{ m: number; sum_amount: number; sum_net: number; sum_vat: number }>>`
        SELECT EXTRACT(MONTH FROM date)::int AS m,
               COALESCE(SUM(amount), 0)::float AS sum_amount,
               COALESCE(SUM("netAmount"), 0)::float AS sum_net,
               COALESCE(SUM("vatAmount"), 0)::float AS sum_vat
        FROM incomes
        WHERE date >= ${startDate} AND date <= ${endDate}
        GROUP BY m ORDER BY m`,
      prisma.$queryRaw<Array<{ m: number; sum_amount: number; sum_net: number; sum_vat_ded: number }>>`
        SELECT EXTRACT(MONTH FROM date)::int AS m,
               COALESCE(SUM(amount), 0)::float AS sum_amount,
               COALESCE(SUM("netAmount"), 0)::float AS sum_net,
               COALESCE(SUM("vatDeductible"), 0)::float AS sum_vat_ded
        FROM expenses
        WHERE date >= ${startDate} AND date <= ${endDate} AND "isRecurring" = false
        GROUP BY m ORDER BY m`,
    ])

    const incMap = new Map(incomeByMonth.map(r => [r.m, r]))
    const expMap = new Map(expenseByMonth.map(r => [r.m, r]))

    const months = Array.from({ length: 12 }, (_, i) => {
      const inc = incMap.get(i + 1)
      const exp = expMap.get(i + 1)
      const incomeNet = inc?.sum_net ?? 0
      const incomeVat = inc?.sum_vat ?? 0
      const expenseNet = exp?.sum_net ?? 0
      const expenseVatDeductible = exp?.sum_vat_ded ?? 0
      const profit = incomeNet - expenseNet

      return {
        month: i + 1,
        profit: Math.round(profit * 100) / 100,
        incomeNet: Math.round(incomeNet * 100) / 100,
        expenseNet: Math.round(expenseNet * 100) / 100,
        incomeGross: Math.round((inc?.sum_amount ?? 0) * 100) / 100,
        expenseGross: Math.round((exp?.sum_amount ?? 0) * 100) / 100,
        vatCollected: Math.round(incomeVat * 100) / 100,
        vatDeductible: Math.round(expenseVatDeductible * 100) / 100,
        vatBalance: Math.round((incomeVat - expenseVatDeductible) * 100) / 100,
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
