'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Flag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'

interface CalendarTask {
  id: string
  title: string
  dueDate: string
  priority: string
  status: string
  project?: { name: string } | null
}

interface CalendarMilestone {
  id: string
  name: string
  dueDate: string
  status: string
  project: { name: string }
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-amber-100 text-amber-700',
  URGENT: 'bg-red-100 text-red-700',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Monday = 0
}

function formatMonthYear(year: number, month: number) {
  return new Date(year, month).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
}

function dateKey(date: Date) {
  return date.toISOString().split('T')[0]
}

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [tasks, setTasks] = useState<CalendarTask[]>([])
  const [milestones, setMilestones] = useState<CalendarMilestone[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const from = new Date(year, month, 1).toISOString().split('T')[0]
    const to = new Date(year, month + 1, 0).toISOString().split('T')[0]

    Promise.all([
      fetch(`/api/tasks?from=${from}&to=${to}&limit=200`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/projects?limit=100`).then((r) => r.ok ? r.json() : null),
    ])
      .then(([tasksData, projectsData]) => {
        const taskItems: CalendarTask[] = (tasksData?.items || []).filter(
          (t: CalendarTask) => t.dueDate
        )
        setTasks(taskItems)

        // Extract milestones from projects
        const ms: CalendarMilestone[] = []
        const projects = projectsData?.items || []
        projects.forEach((p: { name: string; milestones?: { id: string; name: string; dueDate: string; status: string }[] }) => {
          (p.milestones || []).forEach((m) => {
            if (m.dueDate && m.dueDate >= from && m.dueDate <= to) {
              ms.push({ ...m, project: { name: p.name } })
            }
          })
        })
        setMilestones(ms)
      })
      .finally(() => setLoading(false))
  }, [year, month])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  // Map tasks and milestones by date
  const tasksByDate = new Map<string, CalendarTask[]>()
  tasks.forEach((t) => {
    const key = t.dueDate.split('T')[0]
    if (!tasksByDate.has(key)) tasksByDate.set(key, [])
    tasksByDate.get(key)!.push(t)
  })

  const milestonesByDate = new Map<string, CalendarMilestone[]>()
  milestones.forEach((m) => {
    const key = m.dueDate.split('T')[0]
    if (!milestonesByDate.has(key)) milestonesByDate.set(key, [])
    milestonesByDate.get(key)!.push(m)
  })

  const todayKey = dateKey(today)

  function prevMonth() {
    if (month === 0) {
      setMonth(11)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Calendario</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[160px] text-center capitalize">
            {formatMonthYear(year, month)}
          </span>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-[600px] w-full" />
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {DAYS.map((day) => (
                <div key={day} className="py-2 text-center text-xs font-medium text-muted">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {Array.from({ length: totalCells }).map((_, i) => {
                const dayNum = i - firstDay + 1
                const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth
                const cellDate = isCurrentMonth
                  ? new Date(year, month, dayNum).toISOString().split('T')[0]
                  : null
                const isToday = cellDate === todayKey
                const dayTasks = cellDate ? tasksByDate.get(cellDate) || [] : []
                const dayMilestones = cellDate ? milestonesByDate.get(cellDate) || [] : []

                return (
                  <div
                    key={i}
                    className={`min-h-[100px] border-b border-r border-border p-1.5 ${
                      !isCurrentMonth ? 'bg-secondary/30' : ''
                    }`}
                  >
                    {isCurrentMonth && (
                      <>
                        <div
                          className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday
                              ? 'bg-primary text-primary-foreground'
                              : 'text-foreground'
                          }`}
                        >
                          {dayNum}
                        </div>
                        <div className="space-y-0.5">
                          {dayMilestones.slice(0, 2).map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center gap-1 rounded px-1 py-0.5 bg-purple-100 text-purple-700 text-[10px] truncate"
                              title={`${m.name} (${m.project.name})`}
                            >
                              <Flag className="h-2.5 w-2.5 flex-shrink-0" />
                              <span className="truncate">{m.name}</span>
                            </div>
                          ))}
                          {dayTasks.slice(0, 3).map((t) => (
                            <div
                              key={t.id}
                              className={`rounded px-1 py-0.5 text-[10px] truncate ${
                                PRIORITY_COLORS[t.priority] || 'bg-secondary text-foreground'
                              }`}
                              title={`${t.title}${t.project ? ` (${t.project.name})` : ''}`}
                            >
                              {t.title}
                            </div>
                          ))}
                          {dayTasks.length + dayMilestones.length > 5 && (
                            <div className="text-[10px] text-muted pl-1">
                              +{dayTasks.length + dayMilestones.length - 5} altri
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-purple-100 border border-purple-200" />
          <span>Milestone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
          <span>Task</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
          <span>Alta priorita</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
          <span>Urgente</span>
        </div>
      </div>
    </div>
  )
}
