import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    if (!role) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // CLIENT role gets limited team view (no email, phone, login details)
    // Only ADMIN can see login times, IPs, and detailed activity
    const isClient = role === 'CLIENT'
    const isAdminOrManager = role === 'ADMIN'
    const isCalendarViewer = ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'PM'].includes(role)

    const workspaceId = request.nextUrl.searchParams.get('workspace') || undefined

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(isClient && { role: { not: 'CLIENT' } }),
        ...(workspaceId && {
          workspaceMembers: { some: { workspaceId } },
        }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: !isClient,
        role: true,
        avatarUrl: true,
        phone: !isClient,
        lastLoginAt: isAdminOrManager,
        lastActiveAt: !isClient,
        lastIpAddress: isAdminOrManager,
        ...(!isClient && {
          workspaceMembers: {
            select: {
              workspace: { select: { id: true, name: true, color: true } },
              role: true,
            },
          },
        }),
        digitalCard: {
          select: { slug: true, isEnabled: true },
        },
        ...(isCalendarViewer && {
          googleToken: { select: { id: true } },
        }),
        _count: {
          select: {
            assignedTasks: { where: { status: { in: ['TODO', 'IN_PROGRESS'] } } },
            timeEntries: true,
          },
        },
        ...(!isClient && {
          assignedTasks: {
            where: { status: { in: ['TODO', 'IN_PROGRESS'] } },
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              dueDate: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: 5,
          },
        }),
      },
      orderBy: { firstName: 'asc' },
    })

    // Calculate weekly hours and completed tasks this week for each user
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const startOfWeek = new Date(oneWeekAgo)
    startOfWeek.setHours(0, 0, 0, 0)

    const userIds = users.map((u) => u.id)

    const [weeklyTimeEntries, weeklyCompletedTasks] = await Promise.all([
      prisma.timeEntry.groupBy({
        by: ['userId'],
        where: {
          userId: { in: userIds },
          date: { gte: startOfWeek },
        },
        _sum: { hours: true },
      }),
      prisma.task.groupBy({
        by: ['assigneeId'],
        where: {
          assigneeId: { in: userIds },
          status: 'DONE',
          completedAt: { gte: startOfWeek },
        },
        _count: true,
      }),
    ])

    const weeklyHoursMap = new Map(
      weeklyTimeEntries.map((e) => [e.userId, e._sum.hours || 0])
    )
    const weeklyCompletedMap = new Map(
      weeklyCompletedTasks.map((t) => [t.assigneeId, t._count])
    )

    const items = users.map((u) => ({
      ...u,
      totalTasks: u._count.assignedTasks,
      totalTimeEntries: u._count.timeEntries,
      weeklyHours: Math.round((weeklyHoursMap.get(u.id) || 0) * 100) / 100,
      completedThisWeek: weeklyCompletedMap.get(u.id) || 0,
      activeTasks: (u as Record<string, unknown>).assignedTasks || [],
      digitalCardSlug: u.digitalCard?.isEnabled ? u.digitalCard.slug : null,
      ...(isCalendarViewer && { hasGoogleCalendar: !!(u as any).googleToken }),
    }))

    return NextResponse.json({ items, total: items.length })
  } catch (e) {
    console.error('[team]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
