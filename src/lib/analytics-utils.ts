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

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export function computeUserStats(tasks: TaskWithUsers[], now: Date): UserStats[] {
  const userMap: Record<string, { userName: string; assigned: number; completed: number; overdue: number; hoursLogged: number }> = {}

  for (const t of tasks) {
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

  return Object.entries(userMap).map(([userId, data]) => ({
    userId,
    ...data,
    hoursLogged: Math.round(data.hoursLogged * 10) / 10,
  }))
}
