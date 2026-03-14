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

    // Aggregate at DB level by category to avoid loading all rows
    const [incomeByCat, expenseByCat, prevTotals, pendingIncomes] = await Promise.all([
      prisma.$queryRaw<Array<{ category: string; sum_amount: number; sum_net: number; sum_vat: number }>>`
        SELECT category,
               COALESCE(SUM(amount), 0)::float AS sum_amount,
               COALESCE(SUM("netAmount"), 0)::float AS sum_net,
               COALESCE(SUM("vatAmount"), 0)::float AS sum_vat
        FROM incomes
        WHERE date >= ${startDate} AND date <= ${endDate}
          ${businessEntityId ? prisma.$queryRaw`AND "businessEntityId" = ${businessEntityId}` : prisma.$queryRaw``}
        GROUP BY category`,
      prisma.$queryRaw<Array<{ category: string; sum_amount: number; sum_net: number; sum_vat_ded: number }>>`
        SELECT category,
               COALESCE(SUM(amount), 0)::float AS sum_amount,
               COALESCE(SUM("netAmount"), 0)::float AS sum_net,
               COALESCE(SUM("vatDeductible"), 0)::float AS sum_vat_ded
        FROM expenses
        WHERE date >= ${startDate} AND date <= ${endDate} AND "isRecurring" = false
          ${businessEntityId ? prisma.$queryRaw`AND "businessEntityId" = ${businessEntityId}` : prisma.$queryRaw``}
        GROUP BY category`,
      prisma.$queryRaw<Array<{ prev_inc: number; prev_exp: number }>>`
        SELECT
          (SELECT COALESCE(SUM(amount), 0)::float FROM incomes
           WHERE date >= ${prevStartDate} AND date <= ${prevEndDate}
             ${businessEntityId ? prisma.$queryRaw`AND "businessEntityId" = ${businessEntityId}` : prisma.$queryRaw``}
          ) AS prev_inc,
          (SELECT COALESCE(SUM(amount), 0)::float FROM expenses
           WHERE date >= ${prevStartDate} AND date <= ${prevEndDate} AND "isRecurring" = false
             ${businessEntityId ? prisma.$queryRaw`AND "businessEntityId" = ${businessEntityId}` : prisma.$queryRaw``}
          ) AS prev_exp`,
      prisma.income.findMany({
        where: { isPaid: false, date: { gte: startDate, lte: endDate }, ...entityFilter },
        select: { id: true, clientName: true, date: true, amount: true, category: true },
        orderBy: { date: 'asc' },
        take: 20,
      }),
    ])

    // Build category breakdowns from DB aggregates
    const incomeByCategory: Record<string, { gross: number; net: number; vat: number }> = {}
    let totalIncomeGross = 0, totalIncomeNet = 0, totalIncomeVat = 0
    for (const r of incomeByCat) {
      incomeByCategory[r.category] = { gross: r.sum_amount, net: r.sum_net, vat: r.sum_vat }
      totalIncomeGross += r.sum_amount; totalIncomeNet += r.sum_net; totalIncomeVat += r.sum_vat
    }

    const expenseByCategory: Record<string, { gross: number; net: number; vatDeductible: number }> = {}
    let totalExpenseGross = 0, totalExpenseNet = 0, totalExpenseVatDeductible = 0
    for (const r of expenseByCat) {
      expenseByCategory[r.category] = { gross: r.sum_amount, net: r.sum_net, vatDeductible: r.sum_vat_ded }
      totalExpenseGross += r.sum_amount; totalExpenseNet += r.sum_net; totalExpenseVatDeductible += r.sum_vat_ded
    }

    const prevTotalIncomeGross = prevTotals[0]?.prev_inc ?? 0
    const prevTotalExpenseGross = prevTotals[0]?.prev_exp ?? 0

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
