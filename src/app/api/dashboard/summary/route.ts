import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!

    if (!role || !userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const today = new Date(now)
    today.setHours(23, 59, 59, 999)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const isAdmin = role === 'ADMIN'

    // Accounting dashboard date range (same as /api/accounting/dashboard default monthly)
    const accStartDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const accEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const pm = now.getMonth() === 0 ? 12 : now.getMonth()
    const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const prevStartDate = new Date(py, pm - 1, 1)
    const prevEndDate = new Date(py, pm, 0)

    // Build tasks "mine=true&scope=assigned" filter
    const taskAssignedWhere: Record<string, unknown> = {
      parentId: null,
      status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] },
      OR: [
        { assigneeId: userId },
        { assignments: { some: { userId } } },
      ],
    }

    // Activity filter: ADMIN sees all, others see own
    const activityWhere = {
      ...(!isAdmin && { userId }),
    }

    const [
      clientsTotal,
      projectsTotal,
      quotesTotal,
      timeItems,
      teamMembers,
      expenseItems,
      ticketsTotal,
      taskItems,
      activityItems,
      doneMonthTotal,
      inProgressTotal,
      // Accounting data
      accIncomes,
      accExpenses,
      accPrevIncomes,
      accPrevExpenses,
      accPendingIncomes,
    ] = await Promise.all([
      // 1. Clients count (status ACTIVE)
      prisma.client.count({ where: { status: 'ACTIVE' } }),

      // 2. Projects count (status IN_PROGRESS)
      prisma.project.count({
        where: {
          isArchived: false,
          status: 'IN_PROGRESS' as never,
          ...(isAdmin ? {} : { members: { some: { userId } } }),
        },
      }),

      // 3. Quotes count (status SENT)
      prisma.quote.count({ where: { status: 'SENT' as never } }),

      // 4. Time entries (week)
      prisma.timeEntry.findMany({
        where: {
          date: { gte: monday, lte: today },
        },
        take: 200,
        orderBy: { date: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          task: { select: { id: true, title: true, project: { select: { id: true, name: true } } } },
        },
      }),

      // 5. Team members
      prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
        orderBy: { firstName: 'asc' },
      }),

      // 6. Expenses
      prisma.expense.findMany({
        where: {},
        take: 200,
        orderBy: { date: 'desc' },
        include: {
          client: { select: { id: true, companyName: true } },
          project: { select: { id: true, name: true } },
          bankAccount: { select: { id: true, name: true, icon: true } },
          businessEntity: { select: { id: true, name: true } },
        },
      }),

      // 7. Tickets count (OPEN, IN_PROGRESS, WAITING_CLIENT)
      prisma.ticket.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT'] } as never },
      }),

      // 8. Tasks (assigned, TODO/IN_PROGRESS/IN_REVIEW, sort dueDate asc, limit 10)
      prisma.task.findMany({
        where: taskAssignedWhere,
        take: 10,
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          assignments: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            },
            orderBy: { assignedAt: 'asc' },
          },
          project: { select: { id: true, name: true } },
          client: { select: { id: true, companyName: true } },
          _count: { select: { comments: true, subtasks: true } },
        },
      }),

      // 9. Activity log (limit 10)
      prisma.activityLog.findMany({
        where: activityWhere,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),

      // 10. Done tasks this month count
      prisma.task.count({
        where: {
          status: 'DONE',
          completedAt: { gte: monthStart },
        },
      }),

      // 11. In progress tasks count
      prisma.task.count({
        where: { status: 'IN_PROGRESS' },
      }),

      // 12-16. Accounting dashboard data
      prisma.income.findMany({
        where: { date: { gte: accStartDate, lte: accEndDate } },
        select: { category: true, amount: true, netAmount: true, vatAmount: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: accStartDate, lte: accEndDate }, isRecurring: false },
        select: { category: true, amount: true, netAmount: true, vatDeductible: true },
      }),
      prisma.income.findMany({
        where: { date: { gte: prevStartDate, lte: prevEndDate } },
        select: { amount: true, netAmount: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: prevStartDate, lte: prevEndDate }, isRecurring: false },
        select: { amount: true, netAmount: true },
      }),
      prisma.income.findMany({
        where: { isPaid: false, date: { gte: accStartDate, lte: accEndDate } },
        select: { id: true, clientName: true, date: true, amount: true, category: true },
        orderBy: { date: 'asc' },
        take: 20,
      }),
    ])

    // Aggregate accounting data (same logic as /api/accounting/dashboard)
    const incomeByCategory: Record<string, { gross: number; net: number; vat: number }> = {}
    let totalIncomeGross = 0, totalIncomeNet = 0, totalIncomeVat = 0
    for (const i of accIncomes) {
      const cat = i.category
      if (!incomeByCategory[cat]) incomeByCategory[cat] = { gross: 0, net: 0, vat: 0 }
      const g = Number(i.amount); const n = Number(i.netAmount || 0); const v = Number(i.vatAmount || 0)
      incomeByCategory[cat].gross += g; incomeByCategory[cat].net += n; incomeByCategory[cat].vat += v
      totalIncomeGross += g; totalIncomeNet += n; totalIncomeVat += v
    }

    const expenseByCategory: Record<string, { gross: number; net: number; vatDeductible: number }> = {}
    let totalExpenseGross = 0, totalExpenseNet = 0, totalExpenseVatDeductible = 0
    for (const e of accExpenses) {
      const cat = e.category
      if (!expenseByCategory[cat]) expenseByCategory[cat] = { gross: 0, net: 0, vatDeductible: 0 }
      const g = Number(e.amount); const n = Number(e.netAmount || 0); const vd = Number(e.vatDeductible || 0)
      expenseByCategory[cat].gross += g; expenseByCategory[cat].net += n; expenseByCategory[cat].vatDeductible += vd
      totalExpenseGross += g; totalExpenseNet += n; totalExpenseVatDeductible += vd
    }

    const prevTotalIncomeGross = accPrevIncomes.reduce((s, i) => s + Number(i.amount), 0)
    const prevTotalExpenseGross = accPrevExpenses.reduce((s, e) => s + Number(e.amount), 0)
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

    const response = {
      clients: { total: clientsTotal },
      projects: { total: projectsTotal },
      quotes: { total: quotesTotal },
      time: { items: timeItems, total: timeItems.length },
      team: { items: teamMembers, total: teamMembers.length },
      expenses: { items: expenseItems, total: expenseItems.length },
      tickets: { total: ticketsTotal },
      tasks: { items: taskItems, total: taskItems.length },
      activity: { items: activityItems },
      doneMonth: { total: doneMonthTotal },
      inProgress: { total: inProgressTotal },
      accounting: {
        success: true,
        data: {
          period: 'monthly',
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
          pendingInvoices: accPendingIncomes.map(i => ({
            ...i,
            amount: Number(i.amount),
          })),
        },
      },
    }

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'private, max-age=15' },
    })
  } catch (e) {
    console.error('[dashboard/summary]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
