'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useFormPersist } from '@/hooks/useFormPersist'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { MultiUserSelect } from '@/components/ui/MultiUserSelect'
import { Trash2, UserCheck } from 'lucide-react'
import { TaskTimer } from '@/components/tasks/TaskTimer'
import { TaskDependencies } from '@/components/tasks/TaskDependencies'
import { TaskComments } from '@/components/tasks/TaskComments'
import { TaskAttachments } from '@/components/tasks/TaskAttachments'
import { TaskSubtasks } from '@/components/tasks/TaskSubtasks'
import { TaskActivityLog } from '@/components/tasks/TaskActivityLog'
import { TaskMovePanel } from '@/components/tasks/TaskMovePanel'
import {
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  type TaskDetail,
  type TeamMember,
  type Attachment,
  type ActivityLogEntry,
  type Subtask,
  type TaskAssignment,
} from './task-detail-types'

interface TaskDetailModalProps {
  taskId: string | null
  highlightCommentId?: string | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
  userRole?: string
}

export function TaskDetailModal({ taskId, highlightCommentId, open, onClose, onUpdated, userRole }: TaskDetailModalProps) {
  const isCreateMode = !taskId
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [subtaskDetailId, setSubtaskDetailId] = useState<string | null>(null)
  const [subtaskDetailOpen, setSubtaskDetailOpen] = useState(false)
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')

  const isAdmin = userRole === 'ADMIN'

  const editForm = useFormPersist(`task-edit:${taskId || 'new'}`, {
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: '',
  })
  const title = editForm.values.title
  const description = editForm.values.description
  const status = editForm.values.status
  const priority = editForm.values.priority
  const dueDate = editForm.values.dueDate
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])

  /* eslint-disable react-perf/jsx-no-new-function-as-prop -- named handlers for form fields */
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => editForm.setValue('title', e.target.value)
  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => editForm.setValue('description', e.target.value)
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => editForm.setValue('status', e.target.value)
  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => editForm.setValue('priority', e.target.value)
  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => editForm.setValue('dueDate', e.target.value)
  const handleConfirmDeleteCancel = () => setConfirmDelete(false)
  const handleConfirmDeleteShow = () => setConfirmDelete(true)
  /* eslint-enable react-perf/jsx-no-new-function-as-prop */

  const fetchTask = useCallback(async () => {
    if (!taskId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}`)
      if (res.ok) {
        const data: TaskDetail = await res.json()
        setTask(data)
        if (!editForm.hasPersistedData) {
          editForm.setValues({
            title: data.title,
            description: data.description || '',
            status: data.status,
            priority: data.priority,
            dueDate: data.dueDate ? data.dueDate.slice(0, 10) : '',
          })
        }
        setAssigneeIds(
          data.assignments?.length
            ? data.assignments.map((a) => a.user.id)
            : data.assigneeId ? [data.assigneeId] : []
        )
      }
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  const fetchActivity = useCallback(async () => {
    if (!taskId) return
    try {
      const res = await fetch(`/api/activity?entityType=TASK&entityId=${taskId}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        if (data?.items) setActivityLog(data.items)
      }
    } catch {}
  }, [taskId])

  const fetchAttachments = useCallback(async () => {
    if (!taskId) return
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`)
      if (res.ok) {
        const data = await res.json()
        if (data?.items) setAttachments(data.items)
      }
    } catch {}
  }, [taskId])

  const fetchSubtasks = useCallback(async () => {
    if (!taskId) return
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`)
      if (res.ok) {
        const data = await res.json()
        if (data?.items) setSubtasks(data.items)
      }
    } catch {}
  }, [taskId])

  useEffect(() => {
    if (open && taskId) {
      fetchTask()
      fetchAttachments()
      fetchActivity()
      fetchSubtasks()
      setConfirmDelete(false)
    }
    if (open && isCreateMode) {
      setTask(null)
      setAssigneeIds([])
      setSelectedProjectId('')
      if (!editForm.hasPersistedData) {
        editForm.setValues({ title: '', description: '', status: 'TODO', priority: 'MEDIUM', dueDate: '' })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taskId, isCreateMode, fetchTask, fetchAttachments, fetchActivity, fetchSubtasks])

  useEffect(() => {
    if (!highlightCommentId || !open || loading || !task) return
    const timer = setTimeout(() => {
      const el = document.getElementById(`comment-${highlightCommentId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('bg-primary/10')
        setTimeout(() => el.classList.remove('bg-primary/10'), 2000)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [highlightCommentId, open, loading, task])

  useEffect(() => {
    fetch('/api/users?limit=200')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.users) setTeamMembers(d.users)
        else if (d?.items) setTeamMembers(d.items)
        else if (Array.isArray(d)) setTeamMembers(d)
      })
    fetch('/api/projects?limit=200')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.items) setProjects(d.items)
      })
  }, [])

  function buildChangedFields(current: TaskDetail): Record<string, unknown> {
    const STATUS_TO_COLUMN: Record<string, string> = {
      TODO: 'todo', IN_PROGRESS: 'in_progress', IN_REVIEW: 'in_review', DONE: 'done', CANCELLED: 'cancelled',
    }
    const body: Record<string, unknown> = {}
    if (title !== current.title) body.title = title
    if (description !== (current.description || '')) body.description = description || null
    if (status !== current.status) {
      body.status = status
      body.boardColumn = STATUS_TO_COLUMN[status] || status.toLowerCase()
    }
    if (priority !== current.priority) body.priority = priority
    const prevAssigneeIds = current.assignments?.length
      ? current.assignments.map((a: TaskAssignment) => a.user.id).sort()
      : current.assigneeId ? [current.assigneeId] : []
    if (JSON.stringify([...assigneeIds].sort()) !== JSON.stringify(prevAssigneeIds)) {
      body.assigneeIds = assigneeIds.length > 0 ? assigneeIds : []
    }
    const prevDueDate = current.dueDate ? current.dueDate.slice(0, 10) : ''
    if (dueDate !== prevDueDate) body.dueDate = dueDate ? new Date(dueDate).toISOString() : null
    return body
  }

  async function handleCreate() {
    if (saving || !title.trim()) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        priority,
        boardColumn: status === 'TODO' ? 'todo' : status.toLowerCase(),
      }
      if (description.trim()) body.description = description.trim()
      if (dueDate) body.dueDate = new Date(dueDate).toISOString()
      if (selectedProjectId) body.projectId = selectedProjectId
      if (assigneeIds.length > 0) body.assigneeIds = assigneeIds
      body.isPersonal = !selectedProjectId

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        editForm.reset()
        onUpdated()
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    if (!taskId || saving || !task) return
    setSaving(true)
    try {
      const body = buildChangedFields(task)
      if (Object.keys(body).length === 0) {
        editForm.reset()
        onClose()
        return
      }
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        editForm.reset()
        onUpdated()
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!taskId || deleting) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      if (res.ok) {
        onUpdated()
        onClose()
      }
    } finally {
      setDeleting(false)
    }
  }

  function renderAssignedBy() {
    if (isCreateMode || !task?.assignments) return null
    const assignedEntries = task.assignments.filter((a: TaskAssignment) => a.assignedByUser)
    if (assignedEntries.length === 0) return null
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5" />
          Assegnato da
        </label>
        <div className="space-y-1">
          {assignedEntries.map((a: TaskAssignment) => (
            <div key={a.id} className="flex items-center gap-2 text-xs text-muted">
              <Avatar
                name={`${a.assignedByUser!.firstName} ${a.assignedByUser!.lastName}`}
                src={a.assignedByUser!.avatarUrl || undefined}
                size="xs"
              />
              <span>
                <span className="font-medium text-foreground">{a.assignedByUser!.firstName} {a.assignedByUser!.lastName}</span>
                {' → '}
                {a.user.firstName} {a.user.lastName}
              </span>
              <span className="text-foreground/50">
                {new Date(a.assignedAt).toLocaleDateString('it-IT')}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderProjectSection() {
    if (isCreateMode) {
      if (projects.length === 0) return null
      return (
        <Select
          label="Progetto"
          options={projectSelectOptions}
          value={selectedProjectId}
          onChange={handleProjectChange}
        />
      )
    }
    if (task!.project) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>Progetto:</span>
          <Badge variant="default">{task!.project.name}</Badge>
        </div>
      )
    }
    if (task!.isPersonal) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>Tipo:</span>
          <Badge status={priority}>Personale</Badge>
        </div>
      )
    }
    return null
  }

  const projectSelectOptions = useMemo(
    () => [{ value: '', label: 'Personale (nessun progetto)' }, ...projects.map(p => ({ value: p.id, label: p.name }))],
    [projects]
  )

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedProjectId(e.target.value)

  return (
    <Modal open={open} onClose={onClose} title={isCreateMode ? 'Nuova Task' : 'Dettaglio Task'} size="xl" preventAccidentalClose={editForm.isDirty}>
      {!isCreateMode && (loading || !task) ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          {editForm.hasPersistedData && (
            <div className="flex items-center justify-between rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
              <span>Bozza recuperata</span>
              <button type="button" onClick={editForm.reset} className="underline hover:no-underline">Scarta bozza</button>
            </div>
          )}

          <Input
            label="Titolo"
            value={title}
            onChange={handleTitleChange}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Descrizione</label>
            <textarea
              value={description}
              onChange={handleDescChange}
              rows={3}
              className="flex w-full rounded-[10px] border border-border/40 bg-card shadow-[var(--shadow-sm)] px-3 py-2 text-base md:text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              placeholder="Aggiungi una descrizione..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Stato"
              options={STATUS_OPTIONS}
              value={status}
              onChange={handleStatusChange}
            />
            <Select
              label="Priorità"
              options={PRIORITY_OPTIONS}
              value={priority}
              onChange={handlePriorityChange}
            />
          </div>

          <MultiUserSelect
            users={teamMembers}
            selected={assigneeIds}
            onChange={setAssigneeIds}
            label="Assegnati a"
            placeholder="Seleziona assegnatari..."
          />

          {renderAssignedBy()}

          <Input
            label="Scadenza"
            type="date"
            value={dueDate}
            onChange={handleDueDateChange}
          />

          {renderProjectSection()}

          {!isCreateMode && task && (
            <>
              {isAdmin && (
                <TaskMovePanel
                  taskId={task.id}
                  currentProjectId={task.project?.id}
                  currentFolderId={task.folderId}
                  // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- multi-step callback
                  onMoved={() => { fetchTask(); onUpdated() }}
                />
              )}

              <div className="flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <span>Timer</span>
                </div>
                <TaskTimer
                  taskId={task.id}
                  timerStartedAt={task.timerStartedAt}
                  timerUserId={task.timerUserId}
                  onTimerChange={fetchTask}
                />
              </div>

              <div className="border-t border-border pt-4">
                <TaskDependencies taskId={task.id} />
              </div>

              <TaskSubtasks
                taskId={task.id}
                subtasks={subtasks}
                // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- multi-step callback
                onSubtasksChange={() => { fetchSubtasks(); fetchTask() }}
                // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- multi-step callback
                onSubtaskClick={(id) => { setSubtaskDetailId(id); setSubtaskDetailOpen(true) }}
              />

              {subtaskDetailId && (
                <TaskDetailModal
                  taskId={subtaskDetailId}
                  open={subtaskDetailOpen}
                  // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- multi-step callback
                  onClose={() => { setSubtaskDetailOpen(false); setSubtaskDetailId(null) }}
                  // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- multi-step callback
                  onUpdated={() => { fetchSubtasks(); fetchTask(); onUpdated() }}
                  userRole={userRole}
                />
              )}

              <TaskComments
                taskId={task.id}
                comments={task.comments}
                highlightCommentId={highlightCommentId}
                onCommentAdded={fetchTask}
              />

              <TaskAttachments
                taskId={task.id}
                projectId={task.project?.id}
                attachments={attachments}
                onAttachmentsChange={fetchAttachments}
              />

              <TaskActivityLog activityLog={activityLog} />
            </>
          )}

          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between pt-2 border-t border-border gap-3 lg:gap-0">
            <div className="flex items-center gap-3 order-2 lg:order-none">
              <Button variant="outline" onClick={onClose} className="flex-1 lg:flex-none">
                Annulla
              </Button>
              <Button onClick={isCreateMode ? handleCreate : handleSave} disabled={saving || !title.trim()} className="flex-1 lg:flex-none">
                {saving ? 'Salvataggio...' : isCreateMode ? 'Crea Task' : 'Salva'}
              </Button>
            </div>
            {!isCreateMode && (
              <div className="order-1 lg:order-none">
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-destructive">Confermi?</span>
                    <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                      {deleting ? 'Eliminazione...' : 'Si, elimina'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleConfirmDeleteCancel}>
                      No
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onClick={handleConfirmDeleteShow}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Elimina
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
