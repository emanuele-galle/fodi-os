import { describe, it, expect } from 'vitest'
import { computeUserStats } from '@/lib/analytics-utils'

function makeTask(overrides: {
  status?: string
  dueDate?: Date | null
  assigneeId?: string
  assigneeName?: string
  assignments?: { id: string; name: string }[]
  hours?: number[]
} = {}) {
  const assignee = overrides.assigneeId
    ? {
        id: overrides.assigneeId,
        firstName: (overrides.assigneeName || 'User').split(' ')[0],
        lastName: (overrides.assigneeName || 'User').split(' ')[1] || '',
      }
    : null

  return {
    status: overrides.status || 'TODO',
    dueDate: overrides.dueDate ?? null,
    assignee,
    assignments: (overrides.assignments || []).map((a) => ({
      user: { id: a.id, firstName: a.name.split(' ')[0], lastName: a.name.split(' ')[1] || '' },
    })),
    timeEntries: (overrides.hours || []).map((h) => ({ hours: h })),
  }
}

const MARIO_ROSSI = 'Mario Rossi'

describe('Analytics Utils - computeUserStats', () => {
  const now = new Date('2026-03-09T12:00:00Z')

  it('returns empty array for no tasks', () => {
    const result = computeUserStats([], now)
    expect(result).toEqual([])
  })

  it('counts assigned tasks per user', () => {
    const tasks = [
      makeTask({ assigneeId: 'u1', assigneeName: MARIO_ROSSI }),
      makeTask({ assigneeId: 'u1', assigneeName: MARIO_ROSSI }),
      makeTask({ assigneeId: 'u2', assigneeName: 'Luigi Verdi' }),
    ]
    const result = computeUserStats(tasks, now)
    const u1 = result.find((r) => r.userId === 'u1')
    const u2 = result.find((r) => r.userId === 'u2')
    expect(u1?.assigned).toBe(2)
    expect(u2?.assigned).toBe(1)
  })

  it('counts completed tasks', () => {
    const tasks = [
      makeTask({ assigneeId: 'u1', assigneeName: MARIO_ROSSI, status: 'DONE' }),
      makeTask({ assigneeId: 'u1', assigneeName: MARIO_ROSSI, status: 'TODO' }),
    ]
    const result = computeUserStats(tasks, now)
    const u1 = result.find((r) => r.userId === 'u1')
    expect(u1?.completed).toBe(1)
  })

  it('counts overdue tasks', () => {
    const tasks = [
      makeTask({
        assigneeId: 'u1',
        assigneeName: MARIO_ROSSI,
        status: 'TODO',
        dueDate: new Date('2026-03-01'),
      }),
      makeTask({
        assigneeId: 'u1',
        assigneeName: MARIO_ROSSI,
        status: 'TODO',
        dueDate: new Date('2026-04-01'),
      }),
    ]
    const result = computeUserStats(tasks, now)
    const u1 = result.find((r) => r.userId === 'u1')
    expect(u1?.overdue).toBe(1)
  })

  it('does not count DONE tasks as overdue even if past due', () => {
    const tasks = [
      makeTask({
        assigneeId: 'u1',
        assigneeName: MARIO_ROSSI,
        status: 'DONE',
        dueDate: new Date('2026-03-01'),
      }),
    ]
    const result = computeUserStats(tasks, now)
    const u1 = result.find((r) => r.userId === 'u1')
    expect(u1?.overdue).toBe(0)
  })

  it('sums hours logged per user', () => {
    const tasks = [
      makeTask({ assigneeId: 'u1', assigneeName: MARIO_ROSSI, hours: [2.5, 3.0] }),
      makeTask({ assigneeId: 'u1', assigneeName: MARIO_ROSSI, hours: [1.5] }),
    ]
    const result = computeUserStats(tasks, now)
    const u1 = result.find((r) => r.userId === 'u1')
    expect(u1?.hoursLogged).toBe(7)
  })

  it('includes users from assignments (not just assignee)', () => {
    const tasks = [
      makeTask({
        assigneeId: 'u1',
        assigneeName: MARIO_ROSSI,
        assignments: [{ id: 'u2', name: 'Luigi Verdi' }],
      }),
    ]
    const result = computeUserStats(tasks, now)
    expect(result.length).toBe(2)
    expect(result.find((r) => r.userId === 'u2')).toBeDefined()
  })

  it('deduplicates user appearing as both assignee and assignment', () => {
    const tasks = [
      makeTask({
        assigneeId: 'u1',
        assigneeName: MARIO_ROSSI,
        assignments: [{ id: 'u1', name: 'Mario Rossi' }],
      }),
    ]
    const result = computeUserStats(tasks, now)
    expect(result.length).toBe(1)
    expect(result[0].assigned).toBe(1)
  })

  it('rounds hours to 1 decimal', () => {
    const tasks = [
      makeTask({ assigneeId: 'u1', assigneeName: MARIO_ROSSI, hours: [1.33, 2.67] }),
    ]
    const result = computeUserStats(tasks, now)
    const u1 = result.find((r) => r.userId === 'u1')
    expect(u1?.hoursLogged).toBe(4)
  })
})
