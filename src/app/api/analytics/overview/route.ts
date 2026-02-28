import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { requirePermission } from '@/lib/permissions'
import { computeUserStats } from '@/lib/analytics-utils'
import type { Role } from '@/generated/prisma/client'

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { searchParams } = request.nextUrl
    const projectId = searchParams.get('projectId')
    const dateFromParam = searchParams.get('dateFrom')
    const dateToParam = searchParams.get('dateTo')

    const now = new Date()
    const dateFrom = dateFromParam ? new Date(dateFromParam) : new Date(now.getFullYear(), now.getMonth(), 1)
    const dateTo = dateToParam ? new Date(dateToParam + 'T23:59:59.999Z') : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const taskWhere: Record<string, unknown> = {
      createdAt: { gte: dateFrom, lte: dateTo },
    }
    if (projectId) taskWhere.projectId = projectId

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const projectFilter = projectId
      ? Prisma.sql`AND "projectId" = ${projectId}`
      : Prisma.sql``

    // Parallel queries — raw SQL for monthly trend instead of loading 50k tasks
    const [
      tasks,
      timeEntries,
      quotes,
      expenses,
      activeClients,
      openDeals,
      createdByMonth,
      completedByMonth,
    ] = await Promise.all([
      prisma.task.findMany({
        where: taskWhere as Prisma.TaskWhereInput,
        select: {
          id: true,
          status: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
          projectId: true,
          project: { select: { id: true, name: true } },
          assigneeId: true,
          assignee: { select: { id: true, firstName: true, lastName: true } },
          assignments: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
          timeEntries: { select: { hours: true } },
        },
        take: 10000,
      }),
      prisma.timeEntry.findMany({
        where: {
          date: { gte: dateFrom, lte: dateTo },
          ...(projectId ? { projectId } : {}),
        },
        select: { hours: true, projectId: true },
      }),
      prisma.quote.findMany({
        where: {
          createdAt: { gte: dateFrom, lte: dateTo },
          ...(projectId ? { projectId } : {}),
        },
        select: { id: true, total: true, status: true },
      }),
      prisma.expense.findMany({
        where: {
          date: { gte: dateFrom, lte: dateTo },
          ...(projectId ? { projectId } : {}),
        },
        select: { amount: true, category: true },
      }),
      prisma.client.count({
        where: { status: { in: ['ACTIVE', 'LEAD'] } },
      }),
      prisma.deal.findMany({
        where: { stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } },
        select: { id: true, value: true, stage: true },
      }),
      // Monthly trend: created tasks per month (raw SQL instead of 50k findMany)
      prisma.$queryRaw<{ month: Date; count: bigint }[]>`
        SELECT date_trunc('month', "createdAt") as month, COUNT(*) as count
        FROM "Task"
        WHERE "createdAt" >= ${sixMonthsAgo} ${projectFilter}
        GROUP BY 1
      `,
      // Monthly trend: completed tasks per month
      prisma.$queryRaw<{ month: Date; count: bigint }[]>`
        SELECT date_trunc('month', "completedAt") as month, COUNT(*) as count
        FROM "Task"
        WHERE "completedAt" IS NOT NULL AND "completedAt" >= ${sixMonthsAgo} ${projectFilter}
        GROUP BY 1
      `,
    ])

    // === KPI ===
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === 'DONE').length
    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE' && t.status !== 'CANCELLED').length
    const hoursLogged = Math.round(timeEntries.reduce((s, e) => s + e.hours, 0) * 10) / 10
    const quotesEmitted = quotes.length
    const quotesValue = quotes.reduce((s, q) => s + Number(q.total), 0)
    const expensesTotal = expenses.reduce((s, e) => s + Number(e.amount), 0)
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    const kpi = {
      totalTasks,
      completedTasks,
      overdueTasks,
      hoursLogged,
      quotesEmitted,
      quotesValue: Math.round(quotesValue * 100) / 100,
      expensesTotal: Math.round(expensesTotal * 100) / 100,
      activeClients,
      openDeals: openDeals.length,
      completionRate,
    }

    // === MONTHLY TREND (from raw SQL) ===
    const monthLabels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
    const monthlyTrend: { month: string; created: number; completed: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = monthLabels[mStart.getMonth()]

      const created = createdByMonth.find(r => {
        const d = new Date(r.month)
        return d.getMonth() === mStart.getMonth() && d.getFullYear() === mStart.getFullYear()
      })
      const completed = completedByMonth.find(r => {
        const d = new Date(r.month)
        return d.getMonth() === mStart.getMonth() && d.getFullYear() === mStart.getFullYear()
      })

      monthlyTrend.push({
        month: label,
        created: created ? Number(created.count) : 0,
        completed: completed ? Number(completed.count) : 0,
      })
    }

    // === TOP 5 PROJECTS ===
    const projectMap: Record<string, { name: string; completed: number }> = {}
    for (const t of tasks) {
      if (!t.project) continue
      if (!projectMap[t.project.id]) projectMap[t.project.id] = { name: t.project.name, completed: 0 }
      if (t.status === 'DONE') projectMap[t.project.id].completed++
    }
    const topProjects = Object.values(projectMap)
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 5)

    // === TOP 5 MEMBERS ===
    const memberMap: Record<string, { name: string; completed: number }> = {}
    for (const t of tasks) {
      if (t.status !== 'DONE') continue
      const users = new Set<string>()
      const names: Record<string, string> = {}
      if (t.assignee) {
        users.add(t.assignee.id)
        names[t.assignee.id] = `${t.assignee.firstName} ${t.assignee.lastName}`
      }
      for (const a of t.assignments) {
        users.add(a.user.id)
        names[a.user.id] = `${a.user.firstName} ${a.user.lastName}`
      }
      for (const uid of users) {
        if (!memberMap[uid]) memberMap[uid] = { name: names[uid], completed: 0 }
        memberMap[uid].completed++
      }
    }
    const topMembers = Object.values(memberMap)
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 5)

    // === EXPENSES BY CATEGORY ===
    const expByCategory: Record<string, number> = {}
    for (const e of expenses) {
      expByCategory[e.category] = (expByCategory[e.category] || 0) + Number(e.amount)
    }
    const expensesByCategory = Object.entries(expByCategory)
      .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount)

    // === DEALS BY STAGE ===
    const dealsByStage: Record<string, { count: number; value: number }> = {}
    for (const d of openDeals) {
      if (!dealsByStage[d.stage]) dealsByStage[d.stage] = { count: 0, value: 0 }
      dealsByStage[d.stage].count++
      dealsByStage[d.stage].value += Number(d.value)
    }
    const stageOrder = ['QUALIFICATION', 'PROPOSAL', 'NEGOTIATION']
    const dealsPipeline = stageOrder
      .filter(s => dealsByStage[s])
      .map(stage => ({
        stage,
        count: dealsByStage[stage].count,
        value: Math.round(dealsByStage[stage].value * 100) / 100,
      }))

    // === BY USER (team performance) ===
    const byUser = computeUserStats(tasks, now).map(u => ({
      ...u,
      completionRate: u.assigned > 0 ? Math.round((u.completed / u.assigned) * 100) : 0,
    }))

    // === HOURS BY PROJECT ===
    const hoursByProject: Record<string, { name: string; hours: number }> = {}
    for (const t of tasks) {
      if (!t.project) continue
      if (!hoursByProject[t.project.id]) hoursByProject[t.project.id] = { name: t.project.name, hours: 0 }
      hoursByProject[t.project.id].hours += t.timeEntries.reduce((s, e) => s + e.hours, 0)
    }
    const hoursPerProject = Object.values(hoursByProject)
      .map(p => ({ ...p, hours: Math.round(p.hours * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8)

    return NextResponse.json({
      kpi,
      monthlyTrend,
      topProjects,
      topMembers,
      expensesByCategory,
      dealsPipeline,
      byUser,
      hoursPerProject,
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[analytics/overview]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
