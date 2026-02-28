import { prisma } from '@/lib/prisma'
import { getAuthenticatedClient, getCalendarService, withRetry } from '@/lib/google'
import type { AiToolDefinition, AiToolContext } from '../types'

export const dailyTools: AiToolDefinition[] = [
  {
    name: 'get_my_day_summary',
    description: 'Ottieni un riepilogo completo della giornata: task in scadenza oggi, eventi calendario, deal da followare, attività recenti.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Data da analizzare (ISO, default: oggi)' },
      },
    },
    module: 'pm',
    requiredPermission: 'read',
    execute: async (_input, context: AiToolContext) => {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

      // Parallel queries
      const [tasksToday, tasksDueSoon, activeDeals, recentActivity] = await Promise.all([
        // Tasks due today
        prisma.task.findMany({
          where: {
            OR: [
              { assigneeId: context.userId },
              { assignments: { some: { userId: context.userId } } },
            ],
            status: { notIn: ['DONE', 'CANCELLED'] },
            dueDate: { gte: startOfDay, lt: endOfDay },
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            project: { select: { name: true } },
          },
          orderBy: { priority: 'desc' },
        }),
        // Tasks overdue or due within 3 days
        prisma.task.findMany({
          where: {
            OR: [
              { assigneeId: context.userId },
              { assignments: { some: { userId: context.userId } } },
            ],
            status: { notIn: ['DONE', 'CANCELLED'] },
            dueDate: {
              lt: new Date(endOfDay.getTime() + 3 * 24 * 60 * 60 * 1000),
              not: null,
            },
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
          },
          orderBy: { dueDate: 'asc' },
          take: 10,
        }),
        // Active deals owned by user
        prisma.deal.findMany({
          where: {
            ownerId: context.userId,
            stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
          },
          select: {
            id: true,
            title: true,
            stage: true,
            value: true,
            expectedCloseDate: true,
            client: { select: { companyName: true } },
          },
          orderBy: { expectedCloseDate: 'asc' },
          take: 5,
        }),
        // Recent activity
        prisma.activityLog.findMany({
          where: {
            userId: context.userId,
            createdAt: { gte: startOfDay },
          },
          select: { action: true, entityType: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ])

      // Try to get calendar events
      let calendarEvents: unknown[] = []
      try {
        const client = await getAuthenticatedClient(context.userId)
        if (client) {
          const calendar = getCalendarService(client)
          const res = await withRetry(() =>
            calendar.events.list({
              calendarId: 'primary',
              timeMin: startOfDay.toISOString(),
              timeMax: endOfDay.toISOString(),
              maxResults: 10,
              singleEvents: true,
              orderBy: 'startTime',
            })
          )
          calendarEvents = (res.data.items || []).map(e => ({
            summary: e.summary,
            start: e.start?.dateTime || e.start?.date,
            end: e.end?.dateTime || e.end?.date,
            meetLink: e.hangoutLink,
          }))
        }
      } catch {
        // Calendar not connected, skip
      }

      const overdueTasks = tasksDueSoon.filter(t => t.dueDate && t.dueDate < startOfDay)

      return {
        success: true,
        data: {
          date: startOfDay.toISOString().split('T')[0],
          tasksDueToday: tasksToday,
          overdueTasks,
          upcomingTasks: tasksDueSoon.filter(t => t.dueDate && t.dueDate >= endOfDay),
          calendarEvents,
          activeDeals,
          recentActivity: recentActivity.length,
          summary: {
            tasksDueTodayCount: tasksToday.length,
            overdueCount: overdueTasks.length,
            eventsCount: calendarEvents.length,
            activeDealsCount: activeDeals.length,
          },
        },
      }
    },
  },
]
