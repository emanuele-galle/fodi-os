import { useState } from 'react'
import { ListChecks, Plus, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import type { Subtask } from './task-detail-types'

interface TaskSubtasksProps {
  taskId: string
  subtasks: Subtask[]
  onSubtasksChange: () => void
  onSubtaskClick: (id: string) => void
}

export function TaskSubtasks({ taskId, subtasks, onSubtasksChange, onSubtaskClick }: TaskSubtasksProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[] | null>(null)

  const displaySubtasks = localSubtasks ?? subtasks

  async function handleAddSubtask() {
    if (!newSubtaskTitle.trim() || addingSubtask) return
    setAddingSubtask(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSubtaskTitle.trim() }),
      })
      if (res.ok) {
        setNewSubtaskTitle('')
        setLocalSubtasks(null)
        onSubtasksChange()
      }
    } finally {
      setAddingSubtask(false)
    }
  }

  async function handleToggleSubtask(subtaskId: string, currentStatus: string) {
    const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE'
    // Optimistic update
    setLocalSubtasks((displaySubtasks).map((s) => s.id === subtaskId ? { ...s, status: newStatus } : s))
    try {
      const res = await fetch(`/api/tasks/${subtaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, boardColumn: newStatus === 'DONE' ? 'done' : 'todo' }),
      })
      if (!res.ok) {
        setLocalSubtasks(null)
      }
    } catch {
      setLocalSubtasks(null)
    }
  }

  const doneCount = displaySubtasks.filter((s) => s.status === 'DONE').length

  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium flex items-center gap-1.5">
          <ListChecks className="h-4 w-4" />
          Subtask
          {displaySubtasks.length > 0 && (
            <span className="text-xs text-muted">
              ({doneCount}/{displaySubtasks.length})
            </span>
          )}
        </h4>
      </div>

      {displaySubtasks.length > 0 && (
        <>
          <div className="mb-3">
            <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${Math.round((doneCount / displaySubtasks.length) * 100)}%` }}
              />
            </div>
          </div>

          <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
            {displaySubtasks.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-secondary/30 transition-colors group"
              >
                <button
                  onClick={() => handleToggleSubtask(sub.id, sub.status)}
                  className="flex-shrink-0"
                >
                  {sub.status === 'DONE' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted hover:text-primary transition-colors" />
                  )}
                </button>
                <span
                  onClick={() => onSubtaskClick(sub.id)}
                  className={`flex-1 text-sm cursor-pointer hover:text-primary transition-colors truncate ${
                    sub.status === 'DONE' ? 'line-through text-muted' : ''
                  }`}
                >
                  {sub.title}
                </span>
                {sub.assignee && (
                  <Avatar
                    name={`${sub.assignee.firstName} ${sub.assignee.lastName}`}
                    src={sub.assignee.avatarUrl}
                    size="xs"
                  />
                )}
                <Badge status={sub.priority} className="text-[10px] px-1.5 py-0">
                  {sub.priority === 'LOW' ? 'B' : sub.priority === 'MEDIUM' ? 'M' : sub.priority === 'HIGH' ? 'A' : 'U'}
                </Badge>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center gap-2">
        <Plus className="h-4 w-4 text-muted flex-shrink-0" />
        <input
          type="text"
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleAddSubtask()
            }
          }}
          placeholder="Aggiungi subtask..."
          className="flex-1 h-9 md:h-8 rounded-md border border-border bg-transparent px-3 text-base md:text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        {newSubtaskTitle.trim() && (
          <Button
            size="sm"
            onClick={handleAddSubtask}
            disabled={addingSubtask}
            className="h-8"
          >
            {addingSubtask ? '...' : 'Aggiungi'}
          </Button>
        )}
      </div>
    </div>
  )
}
