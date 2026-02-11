'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Trash2, Send } from 'lucide-react'

interface TaskUser {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
}

interface Comment {
  id: string
  content: string
  createdAt: string
  author: TaskUser
}

interface TaskDetail {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  boardColumn: string
  assigneeId: string | null
  assignee: TaskUser | null
  dueDate: string | null
  isPersonal: boolean
  project: { id: string; name: string } | null
  comments: Comment[]
  tags: string[]
}

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
}

interface TaskDetailModalProps {
  taskId: string | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

const STATUS_OPTIONS = [
  { value: 'TODO', label: 'Da fare' },
  { value: 'IN_PROGRESS', label: 'In Corso' },
  { value: 'IN_REVIEW', label: 'In Revisione' },
  { value: 'DONE', label: 'Completato' },
  { value: 'CANCELLED', label: 'Cancellato' },
]

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Bassa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]

const PRIORITY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  LOW: 'outline', MEDIUM: 'default', HIGH: 'warning', URGENT: 'destructive',
}

export function TaskDetailModal({ taskId, open, onClose, onUpdated }: TaskDetailModalProps) {
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('TODO')
  const [priority, setPriority] = useState('MEDIUM')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')

  const fetchTask = useCallback(async () => {
    if (!taskId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}`)
      if (res.ok) {
        const data: TaskDetail = await res.json()
        setTask(data)
        setTitle(data.title)
        setDescription(data.description || '')
        setStatus(data.status)
        setPriority(data.priority)
        setAssigneeId(data.assigneeId || '')
        setDueDate(data.dueDate ? data.dueDate.slice(0, 10) : '')
      }
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    if (open && taskId) {
      fetchTask()
      setConfirmDelete(false)
    }
  }, [open, taskId, fetchTask])

  useEffect(() => {
    fetch('/api/users?limit=200')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.items) setTeamMembers(d.items)
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
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      }
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
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

  async function handleAddComment() {
    if (!taskId || !commentText.trim() || sendingComment) return
    setSendingComment(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      })
      if (res.ok) {
        setCommentText('')
        fetchTask()
      }
    } finally {
      setSendingComment(false)
    }
  }

  const assigneeOptions = [
    { value: '', label: 'Non assegnato' },
    ...teamMembers.map((m) => ({
      value: m.id,
      label: `${m.firstName} ${m.lastName}`,
    })),
  ]

  return (
    <Modal open={open} onClose={onClose} title="Dettaglio Task" size="xl">
      {loading || !task ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          <Input
            label="Titolo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Descrizione</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              placeholder="Aggiungi una descrizione..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Stato"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
            <Select
              label="Priorità"
              options={PRIORITY_OPTIONS}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Assegnato a"
              options={assigneeOptions}
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            />
            <Input
              label="Scadenza"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {task.project && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>Progetto:</span>
              <Badge variant="default">{task.project.name}</Badge>
            </div>
          )}
          {!task.project && task.isPersonal && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>Tipo:</span>
              <Badge variant={PRIORITY_BADGE[priority] || 'default'}>Personale</Badge>
            </div>
          )}

          {/* Comments section */}
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium mb-3">Commenti</h4>
            {task.comments && task.comments.length > 0 ? (
              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {task.comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar
                      name={`${c.author.firstName} ${c.author.lastName}`}
                      src={c.author.avatarUrl}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium">
                          {c.author.firstName} {c.author.lastName}
                        </span>
                        <span className="text-xs text-muted">
                          {new Date(c.createdAt).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 mt-0.5">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted mb-4">Nessun commento ancora.</p>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAddComment()
                  }
                }}
                placeholder="Scrivi un commento..."
                className="flex-1 h-9 rounded-md border border-border bg-transparent px-3 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={!commentText.trim() || sendingComment}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
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
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose}>
                Annulla
              </Button>
              <Button onClick={handleSave} disabled={saving || !title.trim()}>
                {saving ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
