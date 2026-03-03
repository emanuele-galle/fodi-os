import { useState, useCallback } from 'react'
import { ListChecks, Plus, CheckCircle2, Circle, ChevronRight, ChevronDown, Loader2 } from 'lucide-react'
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

const PRIORITY_SHORT: Record<string, string> = {
  LOW: 'B', MEDIUM: 'M', HIGH: 'A', URGENT: 'U',
}

export function TaskSubtasks({ taskId, subtasks, onSubtasksChange, onSubtaskClick }: TaskSubtasksProps) {
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[] | null>(null)
  const [childrenMap, setChildrenMap] = useState<Record<string, Subtask[]>>({})
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  const displaySubtasks = localSubtasks ?? subtasks

  const fetchChildren = useCallback(async (parentId: string) => {
    if (childrenMap[parentId]) return
    setLoadingIds(prev => new Set(prev).add(parentId))
    try {
      const res = await fetch(`/api/tasks/${parentId}/subtasks`)
      if (res.ok) {
        const data = await res.json()
        if (data?.items) setChildrenMap(prev => ({ ...prev, [parentId]: data.items }))
      }
    } finally {
      setLoadingIds(prev => { const next = new Set(prev); next.delete(parentId); return next })
    }
  }, [childrenMap])

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        fetchChildren(id)
      }
      return next
    })
  }

  async function handleToggleSubtask(subtaskId: string, currentStatus: string) {
    const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE'
    setLocalSubtasks(displaySubtasks.map(s => s.id === subtaskId ? { ...s, status: newStatus } : s))
    // Also update in children map
    setChildrenMap(prev => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        next[key] = next[key].map(s => s.id === subtaskId ? { ...s, status: newStatus } : s)
      }
      return next
    })
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

  function countAllDone(items: Subtask[]): { done: number; total: number } {
    let done = 0
    let total = items.length
    for (const item of items) {
      if (item.status === 'DONE') done++
      const children = childrenMap[item.id]
      if (children) {
        const childCounts = countAllDone(children)
        done += childCounts.done
        total += childCounts.total
      }
    }
    return { done, total }
  }

  function handleChildrenChanged(parentId: string) {
    // Invalidate cached children for this parent so they get re-fetched
    setChildrenMap(prev => {
      const next = { ...prev }
      delete next[parentId]
      return next
    })
    fetchChildren(parentId)
    onSubtasksChange()
  }

  const { done: doneCount, total: totalCount } = countAllDone(displaySubtasks)

  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium flex items-center gap-1.5">
          <ListChecks className="h-4 w-4" />
          Subtask
          {totalCount > 0 && (
            <span className="text-xs text-muted">
              ({doneCount}/{totalCount})
            </span>
          )}
        </h4>
      </div>

      {totalCount > 0 && (
        <div className="mb-3">
          <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop -- dynamic runtime value
              style={{ width: `${Math.round((doneCount / totalCount) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-0.5 mb-3 max-h-72 overflow-y-auto">
        {displaySubtasks.map(sub => (
          <SubtaskRow
            key={sub.id}
            subtask={sub}
            depth={0}
            expandedIds={expandedIds}
            loadingIds={loadingIds}
            childrenMap={childrenMap}
            onToggle={handleToggleSubtask}
            onExpand={toggleExpand}
            onClick={onSubtaskClick}
            onAddChild={handleChildrenChanged}
          />
        ))}
      </div>

      <AddSubtaskInput parentId={taskId} onAdded={onSubtasksChange} />
    </div>
  )
}

interface SubtaskRowProps {
  subtask: Subtask
  depth: number
  expandedIds: Set<string>
  loadingIds: Set<string>
  childrenMap: Record<string, Subtask[]>
  onToggle: (id: string, status: string) => void
  onExpand: (id: string) => void
  onClick: (id: string) => void
  onAddChild: (parentId: string) => void
}

function SubtaskRow({ subtask, depth, expandedIds, loadingIds, childrenMap, onToggle, onExpand, onClick, onAddChild }: SubtaskRowProps) {
  const hasChildren = (subtask._count?.subtasks ?? 0) > 0
  const isExpanded = expandedIds.has(subtask.id)
  const isLoading = loadingIds.has(subtask.id)
  const children = childrenMap[subtask.id]
  const [showAddChild, setShowAddChild] = useState(false)

  return (
    <>
      <div
        className="flex items-center gap-1.5 py-1.5 px-2 rounded-md hover:bg-secondary/30 transition-colors group"
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop -- dynamic runtime value
        style={{ paddingLeft: `${8 + depth * 20}px` }}
      >
        {/* Expand/collapse chevron */}
        <button
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- wraps callback with subtask.id
          onClick={() => hasChildren ? onExpand(subtask.id) : undefined}
          className={`flex-shrink-0 w-4 h-4 flex items-center justify-center ${hasChildren ? 'text-muted hover:text-foreground cursor-pointer' : ''}`}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted" />
          ) : hasChildren ? (
            isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
          ) : (
            <span className="w-3" />
          )}
        </button>

        {/* Status toggle */}
        {/* eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- wraps callback with subtask.id */}
        <button onClick={() => onToggle(subtask.id, subtask.status)} className="flex-shrink-0">
          {subtask.status === 'DONE' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Circle className="h-4 w-4 text-muted hover:text-primary transition-colors" />
          )}
        </button>

        {/* Title */}
        <span
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- wraps callback with subtask.id
          onClick={() => onClick(subtask.id)}
          className={`flex-1 text-sm cursor-pointer hover:text-primary transition-colors truncate ${
            subtask.status === 'DONE' ? 'line-through text-muted' : ''
          }`}
        >
          {subtask.title}
        </span>

        {/* Subtask count badge */}
        {hasChildren && (
          <span className="text-xs text-muted">{subtask._count!.subtasks}</span>
        )}

        {/* Add child button */}
        <button
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- toggle with stopPropagation
          onClick={(e) => { e.stopPropagation(); setShowAddChild(!showAddChild) }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-primary"
          title="Aggiungi sotto-subtask"
        >
          <Plus className="h-3 w-3" />
        </button>

        {/* Assignee */}
        {subtask.assignee && (
          <Avatar
            name={`${subtask.assignee.firstName} ${subtask.assignee.lastName}`}
            src={subtask.assignee.avatarUrl}
            size="xs"
          />
        )}

        {/* Priority */}
        <Badge status={subtask.priority} className="text-[10px] px-1.5 py-0">
          {PRIORITY_SHORT[subtask.priority] || subtask.priority}
        </Badge>
      </div>

      {/* Inline add child input */}
      {showAddChild && (
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop -- dynamic runtime value
        <div style={{ paddingLeft: `${28 + depth * 20}px` }} className="py-1">
          <AddSubtaskInput
            parentId={subtask.id}
            // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- wraps callback with subtask.id
            onAdded={() => {
              setShowAddChild(false)
              onAddChild(subtask.id)
              if (!expandedIds.has(subtask.id)) onExpand(subtask.id)
            }}
            compact
          />
        </div>
      )}

      {/* Expanded children */}
      {isExpanded && children && children.map(child => (
        <SubtaskRow
          key={child.id}
          subtask={child}
          depth={depth + 1}
          expandedIds={expandedIds}
          loadingIds={loadingIds}
          childrenMap={childrenMap}
          onToggle={onToggle}
          onExpand={onExpand}
          onClick={onClick}
          onAddChild={onAddChild}
        />
      ))}
    </>
  )
}

function AddSubtaskInput({ parentId, onAdded, compact }: { parentId: string; onAdded: () => void; compact?: boolean }) {
  const [title, setTitle] = useState('')
  const [adding, setAdding] = useState(false)

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value) // eslint-disable-line react-perf/jsx-no-new-function-as-prop -- simple state setter
  const handleKeyDown = (e: React.KeyboardEvent) => { // eslint-disable-line react-perf/jsx-no-new-function-as-prop -- keyboard handler
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
  }

  async function handleAdd() {
    if (!title.trim() || adding) return
    setAdding(true)
    try {
      const res = await fetch(`/api/tasks/${parentId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      })
      if (res.ok) {
        setTitle('')
        onAdded()
      }
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Plus className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-muted flex-shrink-0`} />
      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        onKeyDown={handleKeyDown}
        placeholder="Aggiungi subtask..."
        className={`flex-1 rounded-md border border-border bg-transparent px-3 text-base md:text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/50 ${
          compact ? 'h-7 text-xs' : 'h-9 md:h-8'
        }`}
      />
      {title.trim() && (
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={adding}
          className={compact ? 'h-7 text-xs px-2' : 'h-8'}
        >
          {adding ? '...' : 'Aggiungi'}
        </Button>
      )}
    </div>
  )
}
