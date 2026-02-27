'use client'

import { useState, useEffect, useCallback } from 'react'
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

  const isAdmin = userRole === 'ADMIN'

  const editForm = useFormPersist(`task-edit:${taskId || 'none'}`, {
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
  }, [open, taskId, fetchTask, fetchAttachments, fetchActivity, fetchSubtasks])

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
  }, [])

  async function handleSave() {
    if (!taskId || saving) return
    setSaving(true)
    try {
      const STATUS_TO_COLUMN: Record<string, string> = {
        TODO: 'todo',
        IN_PROGRESS: 'in_progress',
        IN_REVIEW: 'in_review',
        DONE: 'done',
        CANCELLED: 'cancelled',
      }
      const body: Record<string, unknown> = {
        title,
        description: description || null,
        status,
        priority,
        boardColumn: STATUS_TO_COLUMN[status] || status.toLowerCase(),
        assigneeIds: assigneeIds.length > 0 ? assigneeIds : [],
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
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

  return (
    <Modal open={open} onClose={onClose} title="Dettaglio Task" size="xl" preventAccidentalClose={editForm.isDirty}>
      {loading || !task ? (
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
            onChange={(e) => editForm.setValue('title', e.target.value)}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Descrizione</label>
            <textarea
              value={description}
              onChange={(e) => editForm.setValue('description', e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-base md:text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              placeholder="Aggiungi una descrizione..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Stato"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => editForm.setValue('status', e.target.value)}
            />
            <Select
              label="Priorità"
              options={PRIORITY_OPTIONS}
              value={priority}
              onChange={(e) => editForm.setValue('priority', e.target.value)}
            />
          </div>

          <MultiUserSelect
            users={teamMembers}
            selected={assigneeIds}
            onChange={setAssigneeIds}
            label="Assegnati a"
            placeholder="Seleziona assegnatari..."
          />

          {task.assignments && task.assignments.some((a: TaskAssignment) => a.assignedByUser) && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5" />
                Assegnato da
              </label>
              <div className="space-y-1">
                {task.assignments
                  .filter((a: TaskAssignment) => a.assignedByUser)
                  .map((a: TaskAssignment) => (
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
                      <span className="text-muted/50">
                        {new Date(a.assignedAt).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <Input
            label="Scadenza"
            type="date"
            value={dueDate}
            onChange={(e) => editForm.setValue('dueDate', e.target.value)}
          />

          {task.project && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>Progetto:</span>
              <Badge variant="default">{task.project.name}</Badge>
            </div>
          )}
          {!task.project && task.isPersonal && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>Tipo:</span>
              <Badge status={priority}>Personale</Badge>
            </div>
          )}

          {isAdmin && (
            <TaskMovePanel
              taskId={task.id}
              currentProjectId={task.project?.id}
              currentFolderId={task.folderId}
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
            onSubtasksChange={() => { fetchSubtasks(); fetchTask() }}
            onSubtaskClick={(id) => { setSubtaskDetailId(id); setSubtaskDetailOpen(true) }}
          />

          {subtaskDetailId && (
            <TaskDetailModal
              taskId={subtaskDetailId}
              open={subtaskDetailOpen}
              onClose={() => { setSubtaskDetailOpen(false); setSubtaskDetailId(null) }}
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

          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between pt-2 border-t border-border gap-3 md:gap-0">
            <div className="flex items-center gap-3 order-2 md:order-none">
              <Button variant="outline" onClick={onClose} className="flex-1 md:flex-none">
                Annulla
              </Button>
              <Button onClick={handleSave} disabled={saving || !title.trim()} className="flex-1 md:flex-none">
                {saving ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
            <div className="order-1 md:order-none">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-destructive">Confermi?</span>
                  <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Eliminazione...' : 'Si, elimina'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                    No
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Elimina
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
