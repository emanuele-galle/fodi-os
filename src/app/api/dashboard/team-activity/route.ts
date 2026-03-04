import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'
import { sseManager } from '@/lib/sse'

const ALLOWED_ROLES: Role[] = ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'PM']

type Period = 'daily' | 'weekly' | 'monthly'

const MONTH_LABELS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

function getPeriodRange(period: Period): { start: Date; bucketCount: number } {
  const now = new Date()
  if (period === 'monthly') {
    return { start: new Date(now.getFullYear(), now.getMonth() - 11, 1), bucketCount: 12 }
  }
  const daysBack = period === 'daily' ? 29 : 12 * 7
  const start = new Date(now)
  start.setDate(start.getDate() - daysBack)
  start.setHours(0, 0, 0, 0)
  return { start, bucketCount: period === 'daily' ? 30 : 12 }
}

function bucketKey(date: Date, period: Period, refStart: Date): number {
  if (period === 'monthly') {
    return (date.getFullYear() - refStart.getFullYear()) * 12 + date.getMonth() - refStart.getMonth()
  }
  const divisor = period === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
  return Math.floor((date.getTime() - refStart.getTime()) / divisor)
}

function bucketLabel(index: number, period: Period, refStart: Date): string {
  if (period === 'weekly') return `Sett ${index + 1}`
  if (period === 'monthly') return MONTH_LABELS[(refStart.getMonth() + index) % 12]
  const d = new Date(refStart)
  d.setDate(d.getDate() + index)
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`
}

interface ActivityRow {
  userId: string
  action: string
  entityType: string
  entityId: string
  createdAt: Date
}

interface LastAction { action: string; entityType: string; entityId: string; timestamp: string }

function processActivities(
  activities: ActivityRow[],
  period: Period,
  start: Date,
  bucketCount: number,
) {
  const buckets = new Array(bucketCount).fill(0)
  const counts: Record<string, number> = {}
  const lastActions: Record<string, LastAction> = {}

  for (const a of activities) {
    const idx = bucketKey(new Date(a.createdAt), period, start)
    if (idx >= 0 && idx < bucketCount) buckets[idx]++

    counts[a.userId] = (counts[a.userId] || 0) + 1

    if (!lastActions[a.userId]) {
      lastActions[a.userId] = {
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        timestamp: a.createdAt.toISOString(),
      }
    }
  }

  const trend = buckets.map((value, i) => ({ label: bucketLabel(i, period, start), value }))
  return { trend, counts, lastActions }
}

interface TaskRow {
  id: string
  title: string
  status: string
  assigneeId: string | null
  project: { name: string } | null
  assignments: { userId: string }[]
}

function buildTaskMap(tasks: TaskRow[]) {
  const map: Record<string, { id: string; title: string; status: string; projectName: string }> = {}
  for (const task of tasks) {
    const userIds: string[] = []
    if (task.assigneeId) userIds.push(task.assigneeId)
    for (const a of task.assignments) userIds.push(a.userId)

    for (const uid of userIds) {
      if (!map[uid]) {
        map[uid] = { id: task.id, title: task.title, status: task.status, projectName: task.project?.name || '' }
      }
    }
  }
  return map
}

const TASK_SELECT = {
  id: true, title: true, status: true, assigneeId: true, updatedAt: true,
  project: { select: { name: true } },
  assignments: { select: { userId: true } },
} as const

const USER_SELECT = { id: true, firstName: true, lastName: true, avatarUrl: true } as const

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')
    if (!role || !userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const canSeeTeam = ALLOWED_ROLES.includes(role)
    const period = (request.nextUrl.searchParams.get('period') || 'daily') as Period
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return NextResponse.json({ error: 'Periodo non valido' }, { status: 400 })
    }

    const { start, bucketCount } = getPeriodRange(period)

    const [activities, users, currentTasks] = await Promise.all([
      prisma.activityLog.findMany({
        where: { createdAt: { gte: start }, ...(canSeeTeam ? {} : { userId }) },
        select: { userId: true, action: true, entityType: true, entityId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.findMany({
        where: canSeeTeam ? { isActive: true } : { id: userId },
        select: USER_SELECT,
        orderBy: { firstName: 'asc' },
      }),
      prisma.task.findMany({
        where: canSeeTeam
          ? { status: 'IN_PROGRESS' }
          : { status: 'IN_PROGRESS', OR: [{ assigneeId: userId }, { assignments: { some: { userId } } }] },
        select: TASK_SELECT,
        orderBy: { updatedAt: 'desc' },
      }),
    ])

    const { trend, counts, lastActions } = processActivities(activities, period, start, bucketCount)
    const taskMap = buildTaskMap(currentTasks)
    const connectedIds = new Set(sseManager.getConnectedUserIds())

    const members = users
      .map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        avatarUrl: u.avatarUrl,
        activityCount: counts[u.id] || 0,
        isOnline: connectedIds.has(u.id),
        lastAction: lastActions[u.id] || null,
        currentTask: taskMap[u.id] || null,
      }))
      .sort((a, b) => b.activityCount - a.activityCount)

    return NextResponse.json({ trend, members, totalActivities: activities.length }, {
      headers: { 'Cache-Control': 'no-cache' },
    })
  } catch (e) {
    console.error('[dashboard/team-activity]', e)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
