'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Timer, ArrowRight } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { getDueUrgency, URGENCY_STYLES } from '@/lib/task-utils'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { TaskBadges, UrgencyBadge } from './TaskBadges'
import { KANBAN_COLUMNS, STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS, type Task, type TabKey } from './types'

const kanbanCollision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  const columnHit = pointerCollisions.find((c) => String(c.id).startsWith('col-'))
  if (columnHit) return [columnHit]
  if (pointerCollisions.length > 0) return pointerCollisions
  const rectCollisions = rectIntersection(args)
  const rectColumnHit = rectCollisions.find((c) => String(c.id).startsWith('col-'))
  if (rectColumnHit) return [rectColumnHit]
  return rectCollisions
}

function DroppableKanbanColumn({ columnKey, isOver, children }: { columnKey: string; isOver?: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver: over } = useDroppable({
    id: `col-${columnKey}`,
    data: { type: 'column', columnKey },
  })
  const active = isOver ?? over

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-w-[280px] md:min-w-0 rounded-lg transition-colors',
        active && 'ring-2 ring-primary/20 bg-primary/5'
      )}
    >
      {children}
    </div>
  )
}

function DraggableTaskCard({ task, activeTab, userId, onClick, expanded, subtasks, loadingSubtasks, onToggleSubtasks, onSubtaskClick }: { task: Task; activeTab: TabKey; userId: string; onClick: () => void; expanded?: boolean; subtasks?: Task[]; loadingSubtasks?: boolean; onToggleSubtasks?: (taskId: string, e?: React.MouseEvent) => void; onSubtaskClick?: (id: string) => void }) {
  const urgency = getDueUrgency(task.dueDate, task.status)
  const urgencyStyles = URGENCY_STYLES[urgency]
  const hasSubtasks = task._count && task._count.subtasks > 0
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={{ ...style, touchAction: 'none' }} {...attributes} {...listeners}>
    <Card
      style={{ borderLeft: `3px solid ${PRIORITY_COLORS[task.priority] || 'var(--color-primary)'}` }}
      className={cn('!p-3 cursor-grab active:cursor-grabbing', (urgency === 'overdue' || urgency === 'today') && `${urgencyStyles.border} ${urgencyStyles.bg}`)}
      onClick={(e) => { if (!isDragging) { e.stopPropagation(); onClick() } }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        {hasSubtasks && onToggleSubtasks && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSubtasks(task.id, e) }}
            className="p-0.5 rounded hover:bg-secondary/60 transition-colors flex-shrink-0"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5 text-primary" /> : <ChevronRight className="h-3.5 w-3.5 text-muted" />}
          </button>
        )}
        {task.timerStartedAt && (
          <Timer className="h-3.5 w-3.5 text-primary animate-pulse flex-shrink-0" />
        )}
        <p className="text-sm font-medium line-clamp-2">{task.title}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge status={task.priority} pulse={task.priority === 'URGENT'}>
          {PRIORITY_LABELS[task.priority]}
        </Badge>
        <UrgencyBadge urgency={urgency} />
        <TaskBadges task={task} activeTab={activeTab} userId={userId} />
        {task.project && (
          <span className="text-xs text-muted truncate max-w-[100px]">
            {task.project.name}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          {task.creator && task.creator.id !== userId && (
            <>
              <Avatar name={`${task.creator.firstName} ${task.creator.lastName}`} src={task.creator.avatarUrl} size="xs" />
              <ArrowRight className="h-3 w-3 text-muted" />
            </>
          )}
          {(task.assignments?.length ?? 0) > 0 ? (
            <AvatarStack users={task.assignments!.map(a => a.user)} size="xs" max={3} />
          ) : task.assignee ? (
            <Avatar
              name={`${task.assignee.firstName} ${task.assignee.lastName}`}
              src={task.assignee.avatarUrl}
              size="sm"
            />
          ) : (
            <span />
          )}
        </div>
        {task.dueDate && (
          <span className={cn('text-xs', urgencyStyles.text, (urgency === 'overdue' || urgency === 'today') && 'font-medium')}>
            {new Date(task.dueDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>
      {expanded && (
        <div className="mt-2 pl-2 border-l-2 border-primary/20 space-y-1">
          {loadingSubtasks ? (
            <div className="flex items-center gap-1.5 py-1">
              <div className="h-2.5 w-2.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              <span className="text-[10px] text-muted">Caricamento...</span>
            </div>
          ) : subtasks && subtasks.length > 0 ? (
            subtasks.map((sub) => (
              <div
                key={sub.id}
                onClick={(e) => { e.stopPropagation(); onSubtaskClick?.(sub.id) }}
                className="flex items-center gap-1.5 py-1 px-2 rounded bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                style={{ borderLeft: `2px solid ${PRIORITY_COLORS[sub.priority] || 'var(--color-primary)'}` }}
              >
                <span className={cn('text-[10px] font-medium truncate flex-1', sub.status === 'DONE' && 'line-through text-muted')}>{sub.title}</span>
                <Badge status={sub.status} className="text-[8px] px-1 py-0">
                  {STATUS_LABELS[sub.status]?.[0] || sub.status[0]}
                </Badge>
              </div>
            ))
          ) : (
            <span className="text-[10px] text-muted">Nessuna subtask</span>
          )}
        </div>
      )}
    </Card>
    </div>
  )
}

interface TaskKanbanViewProps {
  tasks: Task[]
  activeTab: TabKey
  userId: string
  onTaskClick: (id: string) => void
  onStatusChange?: (taskId: string, newStatus: string) => void
  kanbanDoneCollapsed?: boolean
  onToggleDoneCollapsed?: () => void
  expandedTasks?: Set<string>
  subtasksCache?: Record<string, Task[]>
  loadingSubtasks?: Set<string>
  onToggleSubtasks?: (taskId: string, e?: React.MouseEvent) => void
}

export function TaskKanbanView({ tasks, activeTab, userId, onTaskClick, onStatusChange, kanbanDoneCollapsed, onToggleDoneCollapsed, expandedTasks, subtasksCache, loadingSubtasks, onToggleSubtasks }: TaskKanbanViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  )

  function handleDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as Task | undefined
    if (task) setActiveTask(task)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = event
    if (!over || !onStatusChange) return

    const taskId = active.id as string
    const overData = over.data.current

    let targetStatus: string | null = null
    if (overData?.type === 'column') {
      targetStatus = overData.columnKey as string
    } else if (overData?.type === 'task') {
      targetStatus = (overData.task as Task).status
    } else {
      const overId = String(over.id)
      if (overId.startsWith('col-')) targetStatus = overId.replace('col-', '')
    }

    if (!targetStatus) return
    const currentTask = active.data.current?.task as Task | undefined
    if (!currentTask || currentTask.status === targetStatus) return

    onStatusChange(taskId, targetStatus)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={kanbanCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-mobile-scroll md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {KANBAN_COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.key)
          const isDoneCol = col.key === 'DONE'
          const isCollapsed = isDoneCol && kanbanDoneCollapsed

          return (
            <DroppableKanbanColumn key={col.key} columnKey={col.key}>
              <div className={`flex items-center justify-between mb-3 px-3 py-2.5 rounded-lg border-b-2 ${col.color} ${col.headerBg}`}>
                <h3 className={`text-sm font-bold ${col.headerText}`}>{col.label}</h3>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-semibold ${col.headerText} bg-white/60 dark:bg-white/10 rounded-full px-2 py-0.5`}>
                    {columnTasks.length}
                  </span>
                  {isDoneCol && columnTasks.length > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleDoneCollapsed?.() }}
                      className={`p-0.5 rounded ${col.headerText} hover:bg-white/20 transition-colors`}
                    >
                      {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
              {isCollapsed ? (
                <div className="min-h-[60px] flex items-center justify-center">
                  <button
                    onClick={() => onToggleDoneCollapsed?.()}
                    className="text-xs text-muted hover:text-foreground transition-colors"
                  >
                    Mostra {columnTasks.length} task
                  </button>
                </div>
              ) : (
                <SortableContext items={columnTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className={cn('space-y-2 flex-1 min-h-[60px]', isDoneCol && 'opacity-60')}>
                    {columnTasks.map((task) => (
                      <DraggableTaskCard key={task.id} task={task} activeTab={activeTab} userId={userId} onClick={() => onTaskClick(task.id)} expanded={expandedTasks?.has(task.id)} subtasks={subtasksCache?.[task.id]} loadingSubtasks={loadingSubtasks?.has(task.id)} onToggleSubtasks={onToggleSubtasks} onSubtaskClick={onTaskClick} />
                    ))}
                    {columnTasks.length === 0 && (
                      <div className="text-center py-6 text-sm text-muted">
                        Nessun task
                      </div>
                    )}
                  </div>
                </SortableContext>
              )}
            </DroppableKanbanColumn>
          )
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <Card
            className="!p-3 shadow-lg border-2 border-primary w-72"
            style={{ borderLeft: `3px solid ${PRIORITY_COLORS[activeTask.priority] || 'var(--color-primary)'}` }}
          >
            <p className="text-sm font-medium line-clamp-2 mb-2">{activeTask.title}</p>
            <div className="flex items-center gap-1.5">
              <Badge status={activeTask.priority} pulse={activeTask.priority === 'URGENT'}>
                {PRIORITY_LABELS[activeTask.priority]}
              </Badge>
            </div>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  )
}
