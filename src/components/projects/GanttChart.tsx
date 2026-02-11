'use client'

import { useState, useMemo } from 'react'
import {
  differenceInDays,
  addDays,
  startOfWeek,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  min as dateMin,
  max as dateMax,
  isValid,
} from 'date-fns'
import { it } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'

interface GanttTask {
  id: string
  title: string
  status: string
  dueDate: string | null
  estimatedHours: number | null
  assignee?: { firstName: string; lastName: string } | null
}

interface GanttMilestone {
  id: string
  name: string
  dueDate: string | null
  status: string
}

interface TaskDependency {
  taskId: string
  dependsOnId: string
}

interface GanttChartProps {
  tasks: GanttTask[]
  milestones: GanttMilestone[]
  dependencies?: TaskDependency[]
  onTaskClick?: (taskId: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  TODO: '#94A3B8',
  IN_PROGRESS: '#6366F1',
  IN_REVIEW: '#F59E0B',
  DONE: '#22C55E',
  CANCELLED: '#EF4444',
}

const ROW_HEIGHT = 36
const HEADER_HEIGHT = 48
const LABEL_WIDTH = 200
const MIN_BAR_WIDTH = 8

type ZoomLevel = 'week' | 'month'

export function GanttChart({ tasks, milestones, dependencies = [], onTaskClick }: GanttChartProps) {
  const [zoom, setZoom] = useState<ZoomLevel>('week')

  const pxPerDay = zoom === 'week' ? 7 : 2

  // Compute task bars with start/end dates
  const taskBars = useMemo(() => {
    const today = new Date()
    return tasks.map((task) => {
      let endDate: Date
      let startDate: Date

      if (task.dueDate && isValid(new Date(task.dueDate))) {
        endDate = new Date(task.dueDate)
        const durationDays = task.estimatedHours ? Math.max(1, Math.ceil(task.estimatedHours / 8)) : 3
        startDate = addDays(endDate, -durationDays)
      } else {
        // No due date: place around today
        startDate = today
        endDate = addDays(today, task.estimatedHours ? Math.ceil(task.estimatedHours / 8) : 3)
      }

      return { ...task, startDate, endDate }
    })
  }, [tasks])

  // Compute timeline range
  const { timelineStart, timelineEnd } = useMemo(() => {
    const allDates: Date[] = []
    const today = new Date()
    allDates.push(today)

    for (const bar of taskBars) {
      allDates.push(bar.startDate, bar.endDate)
    }
    for (const m of milestones) {
      if (m.dueDate && isValid(new Date(m.dueDate))) {
        allDates.push(new Date(m.dueDate))
      }
    }

    const minDate = dateMin(allDates)
    const maxDate = dateMax(allDates)

    return {
      timelineStart: startOfWeek(addDays(minDate, -7), { weekStartsOn: 1 }),
      timelineEnd: addDays(maxDate, 14),
    }
  }, [taskBars, milestones])

  const totalDays = differenceInDays(timelineEnd, timelineStart)
  const totalWidth = totalDays * pxPerDay
  const totalRows = taskBars.length + milestones.filter((m) => m.dueDate).length
  const svgHeight = HEADER_HEIGHT + totalRows * ROW_HEIGHT + 20

  // Header markers
  const headerMarkers = useMemo(() => {
    if (zoom === 'week') {
      return eachWeekOfInterval({ start: timelineStart, end: timelineEnd }, { weekStartsOn: 1 }).map((d) => ({
        x: differenceInDays(d, timelineStart) * pxPerDay,
        label: format(d, 'd MMM', { locale: it }),
      }))
    }
    return eachMonthOfInterval({ start: timelineStart, end: timelineEnd }).map((d) => ({
      x: differenceInDays(d, timelineStart) * pxPerDay,
      label: format(d, 'MMM yyyy', { locale: it }),
    }))
  }, [timelineStart, timelineEnd, zoom, pxPerDay])

  // Today line position
  const todayX = differenceInDays(new Date(), timelineStart) * pxPerDay

  // Build task position map for dependencies
  const taskRowMap = new Map<string, number>()
  taskBars.forEach((bar, i) => taskRowMap.set(bar.id, i))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant={zoom === 'week' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setZoom('week')}
        >
          Settimana
        </Button>
        <Button
          variant={zoom === 'month' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setZoom('month')}
        >
          Mese
        </Button>
      </div>

      <div className="flex border border-border rounded-lg overflow-hidden">
        {/* Left labels */}
        <div className="shrink-0 border-r border-border bg-secondary/20" style={{ width: LABEL_WIDTH }}>
          <div
            className="flex items-center px-3 text-xs font-medium text-muted border-b border-border"
            style={{ height: HEADER_HEIGHT }}
          >
            Task / Milestone
          </div>
          {taskBars.map((bar) => (
            <div
              key={bar.id}
              className="flex items-center px-3 text-sm truncate border-b border-border/50 cursor-pointer hover:bg-secondary/40 transition-colors"
              style={{ height: ROW_HEIGHT }}
              onClick={() => onTaskClick?.(bar.id)}
              title={bar.title}
            >
              <div
                className="w-2 h-2 rounded-full mr-2 shrink-0"
                style={{ backgroundColor: STATUS_COLORS[bar.status] || '#94A3B8' }}
              />
              <span className="truncate text-xs">{bar.title}</span>
            </div>
          ))}
          {milestones
            .filter((m) => m.dueDate)
            .map((m) => (
              <div
                key={m.id}
                className="flex items-center px-3 text-sm truncate border-b border-border/50"
                style={{ height: ROW_HEIGHT }}
                title={m.name}
              >
                <span className="text-amber-500 mr-2 text-xs">&#9670;</span>
                <span className="truncate text-xs font-medium">{m.name}</span>
              </div>
            ))}
        </div>

        {/* Right chart area */}
        <div className="flex-1 overflow-x-auto">
          <svg width={totalWidth} height={svgHeight} className="block">
            {/* Header background */}
            <rect x={0} y={0} width={totalWidth} height={HEADER_HEIGHT} fill="var(--color-secondary)" opacity={0.3} />

            {/* Header labels and vertical grid */}
            {headerMarkers.map((marker, i) => (
              <g key={i}>
                <line
                  x1={marker.x}
                  y1={HEADER_HEIGHT}
                  x2={marker.x}
                  y2={svgHeight}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                  opacity={0.5}
                />
                <text
                  x={marker.x + 4}
                  y={HEADER_HEIGHT - 12}
                  fontSize={10}
                  fill="var(--color-muted)"
                >
                  {marker.label}
                </text>
              </g>
            ))}

            {/* Row backgrounds */}
            {Array.from({ length: totalRows }).map((_, i) => (
              <rect
                key={i}
                x={0}
                y={HEADER_HEIGHT + i * ROW_HEIGHT}
                width={totalWidth}
                height={ROW_HEIGHT}
                fill={i % 2 === 0 ? 'transparent' : 'var(--color-secondary)'}
                opacity={0.15}
              />
            ))}

            {/* Today line */}
            {todayX > 0 && todayX < totalWidth && (
              <line
                x1={todayX}
                y1={HEADER_HEIGHT}
                x2={todayX}
                y2={svgHeight}
                stroke="#EF4444"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
            )}

            {/* Dependency arrows */}
            {dependencies.map((dep, i) => {
              const fromRow = taskRowMap.get(dep.dependsOnId)
              const toRow = taskRowMap.get(dep.taskId)
              if (fromRow === undefined || toRow === undefined) return null

              const fromBar = taskBars[fromRow]
              const toBar = taskBars[toRow]
              const fromX = differenceInDays(fromBar.endDate, timelineStart) * pxPerDay
              const fromY = HEADER_HEIGHT + fromRow * ROW_HEIGHT + ROW_HEIGHT / 2
              const toX = differenceInDays(toBar.startDate, timelineStart) * pxPerDay
              const toY = HEADER_HEIGHT + toRow * ROW_HEIGHT + ROW_HEIGHT / 2

              const midX = (fromX + toX) / 2

              return (
                <g key={i}>
                  <path
                    d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
                    fill="none"
                    stroke="var(--color-muted)"
                    strokeWidth={1.5}
                    opacity={0.6}
                  />
                  {/* Arrow head */}
                  <polygon
                    points={`${toX},${toY} ${toX - 6},${toY - 3} ${toX - 6},${toY + 3}`}
                    fill="var(--color-muted)"
                    opacity={0.6}
                  />
                </g>
              )
            })}

            {/* Task bars */}
            {taskBars.map((bar, i) => {
              const x = differenceInDays(bar.startDate, timelineStart) * pxPerDay
              const width = Math.max(MIN_BAR_WIDTH, differenceInDays(bar.endDate, bar.startDate) * pxPerDay)
              const y = HEADER_HEIGHT + i * ROW_HEIGHT + 8

              return (
                <g
                  key={bar.id}
                  className="cursor-pointer"
                  onClick={() => onTaskClick?.(bar.id)}
                >
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={ROW_HEIGHT - 16}
                    rx={4}
                    fill={STATUS_COLORS[bar.status] || '#94A3B8'}
                    opacity={0.85}
                  />
                  {width > 50 && (
                    <text
                      x={x + 6}
                      y={y + (ROW_HEIGHT - 16) / 2 + 4}
                      fontSize={10}
                      fill="white"
                      className="pointer-events-none"
                    >
                      {bar.title.length > width / 6 ? bar.title.slice(0, Math.floor(width / 6)) + '...' : bar.title}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Milestone diamonds */}
            {milestones
              .filter((m) => m.dueDate)
              .map((m, i) => {
                const mDate = new Date(m.dueDate!)
                const x = differenceInDays(mDate, timelineStart) * pxPerDay
                const y = HEADER_HEIGHT + (taskBars.length + i) * ROW_HEIGHT + ROW_HEIGHT / 2

                return (
                  <g key={m.id}>
                    <polygon
                      points={`${x},${y - 7} ${x + 7},${y} ${x},${y + 7} ${x - 7},${y}`}
                      fill={m.status === 'completed' ? '#22C55E' : '#F59E0B'}
                    />
                  </g>
                )
              })}
          </svg>
        </div>
      </div>
    </div>
  )
}
