import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'
import { getDashboardProfile, type DashboardProfile } from '@/lib/dashboard-profiles'

function roundCents(n: number): number {
  return Math.round(n * 100) / 100
}

function toBreakdown(
  obj: Record<string, { gross: number; net: number; vat?: number; vatDeductible?: number }>,
  total: number,
) {
  return Object.entries(obj)
    .map(([category, v]) => ({
      category,
      gross: roundCents(v.gross),
      net: roundCents(v.net),
      vat: roundCents(v.vat ?? v.vatDeductible ?? 0),
      percentage: total > 0 ? Math.round((v.gross / total) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.gross - a.gross)
}

function buildAccountingData(results: unknown[], startIdx: number) {
  const accIncomes = results[startIdx] as { category: string; amount: unknown; netAmount: unknown; vatAmount: unknown }[]
  const accExpenses = results[startIdx + 1] as { category: string; amount: unknown; netAmount: unknown; vatDeductible: unknown }[]
  const accPrevIncomes = results[startIdx + 2] as { amount: unknown; netAmount: unknown }[]
  const accPrevExpenses = results[startIdx + 3] as { amount: unknown; netAmount: unknown }[]
  const accPendingIncomes = results[startIdx + 4] as { id: string; clientName: string; date: unknown; amount: unknown; category: string }[]

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

  return {
    success: true,
    data: {
      period: 'monthly',
      income: {
        totalGross: roundCents(totalIncomeGross),
        totalNet: roundCents(totalIncomeNet),
        totalVat: roundCents(totalIncomeVat),
        byCategory: toBreakdown(incomeByCategory, totalIncomeGross),
      },
      expense: {
        totalGross: roundCents(totalExpenseGross),
        totalNet: roundCents(totalExpenseNet),
        totalVatDeductible: roundCents(totalExpenseVatDeductible),
        byCategory: toBreakdown(expenseByCategory, totalExpenseGross),
      },
      profitNet: roundCents(totalIncomeNet - totalExpenseNet),
      comparison: {
        prevIncomeGross: roundCents(prevTotalIncomeGross),
        prevExpenseGross: roundCents(prevTotalExpenseGross),
        deltaIncome: roundCents(totalIncomeGross - prevTotalIncomeGross),
        deltaExpense: roundCents(totalExpenseGross - prevTotalExpenseGross),
      },
      pendingInvoices: accPendingIncomes.map(i => ({ ...i, amount: Number(i.amount) })),
    },
  }
}

function profileNeedsSection(profile: DashboardProfile, section: 'clients' | 'quotes' | 'accounting' | 'team' | 'expenses') {
  const map: Record<string, DashboardProfile[]> = {
    clients: ['executive', 'commercial'],
    quotes: ['executive', 'commercial'],
    accounting: ['executive', 'commercial'],
    team: ['executive', 'operational'],
    expenses: ['executive'],
  }
  return map[section].includes(profile)
}

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!

    if (!role || !userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const profile = getDashboardProfile(role)
    const isAdmin = role === 'ADMIN'

    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const today = new Date(now)
    today.setHours(23, 59, 59, 999)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const needsAccounting = profileNeedsSection(profile, 'accounting')

    const queries: Promise<unknown>[] = [
      // 0. Clients count
      profileNeedsSection(profile, 'clients')
        ? prisma.client.count({ where: { status: 'ACTIVE' } })
        : Promise.resolve(0),

      // 1. Projects count
      prisma.project.count({
        where: {
          isArchived: false,
          status: 'IN_PROGRESS' as never,
          ...(isAdmin ? {} : { members: { some: { userId } } }),
        },
      }),

      // 2. Quotes count
      profileNeedsSection(profile, 'quotes')
        ? prisma.quote.count({ where: { status: 'SENT' as never } })
        : Promise.resolve(0),

      // 3. Time entries (week)
      prisma.timeEntry.findMany({
        where: { date: { gte: monday, lte: today } },
        take: 200,
        orderBy: { date: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          task: { select: { id: true, title: true, project: { select: { id: true, name: true } } } },
        },
      }),

      // 4. Team members
      profileNeedsSection(profile, 'team')
        ? prisma.user.findMany({
            where: { isActive: true },
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            orderBy: { firstName: 'asc' },
          })
        : Promise.resolve([]),

      // 5. Expenses
      profileNeedsSection(profile, 'expenses')
        ? prisma.expense.findMany({
            where: {},
            take: 200,
            orderBy: { date: 'desc' },
            include: {
              client: { select: { id: true, companyName: true } },
              project: { select: { id: true, name: true } },
              bankAccount: { select: { id: true, name: true, icon: true } },
              businessEntity: { select: { id: true, name: true } },
            },
          })
        : Promise.resolve([]),

      // 6. Tickets count
      prisma.ticket.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT'] } as never },
      }),

      // 7. Tasks (assigned to user)
      prisma.task.findMany({
        where: {
          parentId: null,
          status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] },
          OR: [{ assigneeId: userId }, { assignments: { some: { userId } } }],
        },
        take: 10,
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          creator: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          assignments: {
            include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
            orderBy: { assignedAt: 'asc' },
          },
          project: { select: { id: true, name: true } },
          client: { select: { id: true, companyName: true } },
          _count: { select: { comments: true, subtasks: true } },
        },
      }),

      // 8. Activity log
      prisma.activityLog.findMany({
        where: isAdmin ? {} : { userId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      }),

      // 9. Done tasks this month
      prisma.task.count({ where: { status: 'DONE', completedAt: { gte: monthStart } } }),

      // 10. In progress tasks
      prisma.task.count({ where: { status: 'IN_PROGRESS' } }),
    ]

    if (needsAccounting) {
      const accStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const accEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const pm = now.getMonth() === 0 ? 12 : now.getMonth()
      const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

      queries.push(
        prisma.income.findMany({ where: { date: { gte: accStart, lte: accEnd } }, select: { category: true, amount: true, netAmount: true, vatAmount: true } }),
        prisma.expense.findMany({ where: { date: { gte: accStart, lte: accEnd }, isRecurring: false }, select: { category: true, amount: true, netAmount: true, vatDeductible: true } }),
        prisma.income.findMany({ where: { date: { gte: new Date(py, pm - 1, 1), lte: new Date(py, pm, 0) } }, select: { amount: true, netAmount: true } }),
        prisma.expense.findMany({ where: { date: { gte: new Date(py, pm - 1, 1), lte: new Date(py, pm, 0) }, isRecurring: false }, select: { amount: true, netAmount: true } }),
        prisma.income.findMany({ where: { isPaid: false, date: { gte: accStart, lte: accEnd } }, select: { id: true, clientName: true, date: true, amount: true, category: true }, orderBy: { date: 'asc' }, take: 20 }),
      )
    }

    const results = await Promise.all(queries)

    const [clientsTotal, projectsTotal, quotesTotal, timeItems, teamMembers, expenseItems, ticketsTotal, taskItems, activityItems, doneMonthTotal, inProgressTotal] =
      results as [number, number, number, unknown[], unknown[], unknown[], number, unknown[], unknown[], number, number]

    const response: Record<string, unknown> = {
      clients: { total: clientsTotal },
      projects: { total: projectsTotal },
      quotes: { total: quotesTotal },
      time: { items: timeItems, total: (timeItems as unknown[]).length },
      team: { items: teamMembers, total: (teamMembers as unknown[]).length },
      expenses: { items: expenseItems, total: (expenseItems as unknown[]).length },
      tickets: { total: ticketsTotal },
      tasks: { items: taskItems, total: (taskItems as unknown[]).length },
      activity: { items: activityItems },
      doneMonth: { total: doneMonthTotal },
      inProgress: { total: inProgressTotal },
    }

    if (needsAccounting && results.length > 11) {
      response.accounting = buildAccountingData(results, 11)
    }

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'private, max-age=15' },
    })
  } catch (e) {
    console.error('[dashboard/summary]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
