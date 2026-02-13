import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    // PM:read o ADMIN hanno accesso
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

    // Fetch tutte le task con filtri
    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        assignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        timeEntries: { select: { hours: true } },
        project: { select: { id: true, name: true } },
      },
    })

    const now = new Date()

    // === SUMMARY ===
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === 'DONE').length
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length
    const overdue = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE' && t.status !== 'CANCELLED'
    ).length

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    // Tempo medio completamento (giorni)
    const completedTasks = tasks.filter((t) => t.status === 'DONE' && t.completedAt)
    const avgCompletionDays =
      completedTasks.length > 0
        ? Math.round(
            completedTasks.reduce((sum, t) => {
              const created = new Date(t.createdAt).getTime()
              const done = new Date(t.completedAt!).getTime()
              return sum + (done - created) / (1000 * 60 * 60 * 24)
            }, 0) / completedTasks.length
          )
        : 0

    const summary = { total, completed, inProgress, overdue, completionRate, avgCompletionDays }

    // === BY STATUS ===
    const statusCounts: Record<string, number> = {}
    for (const t of tasks) {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
    }
    const byStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

    // === BY PRIORITY ===
    const priorityCounts: Record<string, number> = {}
    for (const t of tasks) {
      priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1
    }
    const byPriority = Object.entries(priorityCounts).map(([priority, count]) => ({ priority, count }))

    // === BY USER ===
    const userMap: Record<string, { userName: string; assigned: number; completed: number; overdue: number; hoursLogged: number }> = {}
    for (const t of tasks) {
      // Collect all users involved (assignee + assignments)
      const userIds = new Set<string>()
      const userNames: Record<string, string> = {}
      if (t.assignee) {
        userIds.add(t.assignee.id)
        userNames[t.assignee.id] = `${t.assignee.firstName} ${t.assignee.lastName}`
      }
      for (const a of t.assignments) {
        userIds.add(a.user.id)
        userNames[a.user.id] = `${a.user.firstName} ${a.user.lastName}`
      }

      const hours = t.timeEntries.reduce((s, e) => s + e.hours, 0)

      for (const uid of userIds) {
        if (!userMap[uid]) {
          userMap[uid] = { userName: userNames[uid], assigned: 0, completed: 0, overdue: 0, hoursLogged: 0 }
        }
        userMap[uid].assigned++
        if (t.status === 'DONE') userMap[uid].completed++
        if (t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE' && t.status !== 'CANCELLED') {
          userMap[uid].overdue++
        }
        userMap[uid].hoursLogged += hours
      }
    }
    const byUser = Object.entries(userMap).map(([userId, data]) => ({
      userId,
      ...data,
      hoursLogged: Math.round(data.hoursLogged * 10) / 10,
    }))

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
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
