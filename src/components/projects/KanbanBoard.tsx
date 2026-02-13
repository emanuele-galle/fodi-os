'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  boardColumn: string
  dueDate: string | null
  estimatedHours: number | null
  assignee?: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null
}

const BOARD_COLUMNS = [
  { key: 'todo', label: 'Da Fare' },
  { key: 'in_progress', label: 'In Corso' },
  { key: 'in_review', label: 'In Revisione' },
  { key: 'done', label: 'Completato' },
]

const PRIORITY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  LOW: 'outline', MEDIUM: 'default', HIGH: 'warning', URGENT: 'destructive',
}

function SortableTaskCard({ task, onClick }: { task: Task; onClick?: () => void }) {
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
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!isDragging && onClick) {
          e.stopPropagation()
          onClick()
        }
      }}
      className="bg-card rounded-md border border-border p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
    >
      <p className="font-medium text-sm mb-2">{task.title}</p>
      <div className="flex items-center justify-between">
        <Badge variant={PRIORITY_BADGE[task.priority] || 'default'} className="text-[10px]">
          {task.priority}
        </Badge>
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span className="text-[10px] text-muted">
              {new Date(task.dueDate).toLocaleDateString('it-IT')}
            </span>
          )}
          {task.assignee && (
            <Avatar
              name={`${task.assignee.firstName} ${task.assignee.lastName}`}
              src={task.assignee.avatarUrl}
              size="sm"
              className="!h-6 !w-6 !text-[10px]"
            />
          )}
        </div>
      </div>
    </div>
  )
}

function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <div className="bg-card rounded-md border-2 border-primary p-3 shadow-lg w-72">
      <p className="font-medium text-sm mb-2">{task.title}</p>
      <div className="flex items-center justify-between">
        <Badge variant={PRIORITY_BADGE[task.priority] || 'default'} className="text-[10px]">
          {task.priority}
        </Badge>
        <div className="flex items-center gap-2">
          {task.assignee && (
            <Avatar
              name={`${task.assignee.firstName} ${task.assignee.lastName}`}
              src={task.assignee.avatarUrl}
              size="sm"
              className="!h-6 !w-6 !text-[10px]"
            />
          )}
        </div>
      </div>
    </div>
  )
}

function DroppableColumn({ columnKey, children }: { columnKey: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${columnKey}`,
    data: { type: 'column', columnKey },
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 rounded-lg p-3 transition-colors ${
        isOver ? 'bg-primary/5 ring-2 ring-primary/20' : 'bg-secondary/30'
      }`}
    >
      {children}
    </div>
  )
}

interface KanbanBoardProps {
  tasksByColumn: Record<string, Task[]>
  onColumnChange: (taskId: string, newColumn: string) => void
  onAddTask?: (column: string) => void
  onTaskClick?: (taskId: string) => void
}

export function KanbanBoard({ tasksByColumn, onColumnChange, onAddTask, onTaskClick }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as Task | undefined
    if (task) setActiveTask(task)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const overData = over.data.current

    // Determine target column
    let targetColumn: string | null = null
    if (overData?.type === 'column') {
      targetColumn = overData.columnKey as string
    } else if (overData?.type === 'task') {
      targetColumn = (overData.task as Task).boardColumn
    }

    if (!targetColumn) return

    // Find current column
    const currentTask = active.data.current?.task as Task | undefined
    if (!currentTask || currentTask.boardColumn === targetColumn) return

    onColumnChange(taskId, targetColumn)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {BOARD_COLUMNS.map((col) => {
          const tasks = tasksByColumn[col.key] || []
          return (
            <DroppableColumn key={col.key} columnKey={col.key}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-sm">{col.label}</span>
                <span className="text-xs text-muted bg-secondary rounded-full px-2 py-0.5">
                  {tasks.length}
                </span>
              </div>

              <SortableContext
                items={tasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 min-h-[60px] mb-2">
                  {tasks.map((task) => (
                    <SortableTaskCard key={task.id} task={task} onClick={onTaskClick ? () => onTaskClick(task.id) : undefined} />
                  ))}
                </div>
              </SortableContext>

              {onAddTask && (
                <button
                  onClick={() => onAddTask(col.key)}
                  className="w-full text-sm text-muted hover:text-foreground hover:bg-secondary rounded-md py-2 transition-colors"
                >
                  + Aggiungi task
                </button>
              )}
            </DroppableColumn>
          )
        })}
      </div>

      <DragOverlay>
        {activeTask && <TaskCardOverlay task={activeTask} />}
      </DragOverlay>
    </DndContext>
  )
}
