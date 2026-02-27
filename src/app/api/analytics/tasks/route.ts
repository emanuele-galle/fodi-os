import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { computeUserStats } from '@/lib/analytics-utils'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    // PM:read o ADMIN hanno accesso
    const { requirePermission } = await import('@/lib/permissions')
    requirePermission(role, 'pm', 'read')

    const { searchParams } = request.nextUrl
    const projectId = searchParams.get('projectId')
    const userId = searchParams.get('userId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Filtro base per le task
    const where: Record<string, unknown> = {}
    if (projectId) where.projectId = projectId
    if (userId) {
      where.OR = [
        { assigneeId: userId },
        { assignments: { some: { userId } } },
      ]
    }
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom)
      if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo + 'T23:59:59.999Z')
    }

    const now = new Date()
    const overdueWhere = {
      ...where,
      dueDate: { lt: now },
      status: { notIn: ['DONE', 'CANCELLED'] as string[] },
    }

    // Parallel: groupBy for counts + slimmer findMany for user/project stats
    const [byStatusRaw, byPriorityRaw, overdueCount, avgRaw, tasks] = await Promise.all([
      prisma.task.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: where as Prisma.TaskWhereInput,
      }),
      prisma.task.groupBy({
        by: ['priority'],
        _count: { _all: true },
        where: where as Prisma.TaskWhereInput,
      }),
      prisma.task.count({
        where: overdueWhere as Prisma.TaskWhereInput,
      }),
      // Avg completion days via raw SQL
      prisma.$queryRaw<[{ avg_days: number | null }]>`
        SELECT AVG(EXTRACT(EPOCH FROM ("completedAt" - "createdAt")) / 86400)::float as avg_days
        FROM "Task"
        WHERE "status" = 'DONE' AND "completedAt" IS NOT NULL
        ${projectId ? Prisma.sql`AND "projectId" = ${projectId}` : Prisma.sql``}
        ${userId ? Prisma.sql`AND ("assigneeId" = ${userId} OR "id" IN (SELECT "taskId" FROM "TaskAssignment" WHERE "userId" = ${userId}))` : Prisma.sql``}
        ${dateFrom ? Prisma.sql`AND "createdAt" >= ${new Date(dateFrom)}` : Prisma.sql``}
        ${dateTo ? Prisma.sql`AND "createdAt" <= ${new Date(dateTo + 'T23:59:59.999Z')}` : Prisma.sql``}
      `,
      // Still need tasks for byUser, hoursComparison, weeklyTrend
      prisma.task.findMany({
        where: where as Prisma.TaskWhereInput,
        take: 10000,
        select: {
          status: true,
          dueDate: true,
          createdAt: true,
          completedAt: true,
          estimatedHours: true,
          assignee: { select: { id: true, firstName: true, lastName: true } },
          assignments: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          timeEntries: { select: { hours: true } },
          project: { select: { id: true, name: true } },
        },
      }),
    ])

    // === SUMMARY (from groupBy) ===
    const total = byStatusRaw.reduce((s, g) => s + g._count._all, 0)
    const completed = byStatusRaw.find(g => g.status === 'DONE')?._count._all || 0
    const inProgress = byStatusRaw.find(g => g.status === 'IN_PROGRESS')?._count._all || 0
    const avgCompletionDays = avgRaw[0]?.avg_days ? Math.round(avgRaw[0].avg_days) : 0
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    const summary = { total, completed, inProgress, overdue: overdueCount, completionRate, avgCompletionDays }

    // === BY STATUS (from groupBy) ===
    const byStatus = byStatusRaw.map(g => ({ status: g.status, count: g._count._all }))

    // === BY PRIORITY (from groupBy) ===
    const byPriority = byPriorityRaw.map(g => ({ priority: g.priority, count: g._count._all }))

    // === BY USER ===
    const byUser = computeUserStats(tasks, now)

    // === WEEKLY TREND (ultime 12 settimane) ===
    const weeklyTrend: { week: string; completed: number; created: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay() + 1 - i * 7) // Monday
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      const weekLabel = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`

      const createdInWeek = tasks.filter((t) => {
        const d = new Date(t.createdAt)
        return d >= weekStart && d <= weekEnd
      }).length

      const completedInWeek = tasks.filter((t) => {
        if (!t.completedAt) return false
        const d = new Date(t.completedAt)
        return d >= weekStart && d <= weekEnd
      }).length

      weeklyTrend.push({ week: weekLabel, completed: completedInWeek, created: createdInWeek })
    }

    // === HOURS COMPARISON (per progetto) ===
    const projectHoursMap: Record<string, { projectName: string; estimated: number; actual: number }> = {}
    for (const t of tasks) {
      if (!t.project) continue
      const pid = t.project.id
      if (!projectHoursMap[pid]) {
        projectHoursMap[pid] = { projectName: t.project.name, estimated: 0, actual: 0 }
      }
      projectHoursMap[pid].estimated += t.estimatedHours || 0
      projectHoursMap[pid].actual += t.timeEntries.reduce((s, e) => s + e.hours, 0)
    }
    const hoursComparison = Object.values(projectHoursMap).map((p) => ({
      ...p,
      estimated: Math.round(p.estimated * 10) / 10,
      actual: Math.round(p.actual * 10) / 10,
    }))

    return NextResponse.json({
      summary,
      byStatus,
      byPriority,
      byUser,
      weeklyTrend,
      hoursComparison,
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[analytics/tasks]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
