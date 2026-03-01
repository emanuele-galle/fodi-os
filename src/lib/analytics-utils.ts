interface TaskWithUsers {
  status: string
  dueDate: Date | null
  assignee: { id: string; firstName: string; lastName: string } | null
  assignments: { user: { id: string; firstName: string; lastName: string } }[]
  timeEntries: { hours: number }[]
}

interface UserStats {
  userId: string
  userName: string
  assigned: number
  completed: number
  overdue: number
  hoursLogged: number
}

function collectTaskUsers(task: TaskWithUsers): Map<string, string> {
  const users = new Map<string, string>()
  if (task.assignee) {
    users.set(task.assignee.id, `${task.assignee.firstName} ${task.assignee.lastName}`)
  }
  for (const a of task.assignments) {
    users.set(a.user.id, `${a.user.firstName} ${a.user.lastName}`)
  }
  return users
}

function isOverdue(task: TaskWithUsers, now: Date): boolean {
  return !!(task.dueDate && new Date(task.dueDate) < now && task.status !== 'DONE' && task.status !== 'CANCELLED')
}

export function computeUserStats(tasks: TaskWithUsers[], now: Date): UserStats[] {
  const userMap: Record<string, { userName: string; assigned: number; completed: number; overdue: number; hoursLogged: number }> = {}

  for (const t of tasks) {
    const users = collectTaskUsers(t)
    const hours = t.timeEntries.reduce((s, e) => s + e.hours, 0)
    const overdue = isOverdue(t, now)

    for (const [uid, name] of users) {
      if (!userMap[uid]) {
        userMap[uid] = { userName: name, assigned: 0, completed: 0, overdue: 0, hoursLogged: 0 }
      }
      userMap[uid].assigned++
      if (t.status === 'DONE') userMap[uid].completed++
      if (overdue) userMap[uid].overdue++
      userMap[uid].hoursLogged += hours
    }
  }

  return Object.entries(userMap).map(([userId, data]) => ({
    userId,
    ...data,
    hoursLogged: Math.round(data.hoursLogged * 10) / 10,
  }))
}
