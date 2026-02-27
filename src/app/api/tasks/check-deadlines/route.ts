import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dispatchNotification } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    const tomorrowEnd = new Date(todayStart.getTime() + 2 * 24 * 60 * 60 * 1000)

    const [overdueTasks, todayTasks, tomorrowTasks] = await Promise.all([
      prisma.task.findMany({
        where: { status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] }, dueDate: { lt: todayStart } },
        include: { assignments: { select: { userId: true } } },
      }),
      prisma.task.findMany({
        where: { status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] }, dueDate: { gte: todayStart, lt: todayEnd } },
        include: { assignments: { select: { userId: true } } },
      }),
      prisma.task.findMany({
        where: { status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] }, dueDate: { gte: todayEnd, lt: tomorrowEnd } },
        include: { assignments: { select: { userId: true } } },
      }),
    ])

    let notifCount = 0

    async function notifyTaskUsers(
      tasks: typeof overdueTasks,
      type: string,
      titleFn: (title: string) => string,
      messageFn: (title: string) => string
    ) {
      for (const task of tasks) {
        const userIds = new Set<string>()
        userIds.add(task.creatorId)
        for (const a of task.assignments) userIds.add(a.userId)

        // Use groupKey for dedup: same task won't generate duplicate deadline notifications
        await dispatchNotification({
          type,
          title: titleFn(task.title),
          message: messageFn(task.title),
          link: `/tasks?taskId=${task.id}`,
          groupKey: `deadline:${task.id}`,
          recipientIds: Array.from(userIds),
          excludeUserId: null,
        })
        notifCount += userIds.size
      }
    }

    await notifyTaskUsers(
      overdueTasks,
      'task_overdue',
      () => 'Task scaduta',
      (title) => `"${title}" ha superato la scadenza`
    )

    await notifyTaskUsers(
      todayTasks,
      'task_due_today',
      () => 'Task in scadenza oggi',
      (title) => `"${title}" scade oggi`
    )

    await notifyTaskUsers(
      tomorrowTasks,
      'task_due_tomorrow',
      () => 'Task in scadenza domani',
      (title) => `"${title}" scade domani`
    )

    return NextResponse.json({
      ok: true,
      overdue: overdueTasks.length,
      today: todayTasks.length,
      tomorrow: tomorrowTasks.length,
      notifications: notifCount,
    })
  } catch (e) {
    console.error('[check-deadlines]', e)
    return NextResponse.json(
      { error: 'Errore nel controllo scadenze', details: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
