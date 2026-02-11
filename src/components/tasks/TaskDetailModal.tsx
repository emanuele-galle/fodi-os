'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { MultiUserSelect } from '@/components/ui/MultiUserSelect'
import { Trash2, Send, Paperclip, FileText, Image, Download, X } from 'lucide-react'

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

interface Attachment {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  createdAt: string
  uploadedBy: { id: string; firstName: string; lastName: string }
}

interface TaskAssignment {
  id: string
  role: string
  user: TaskUser
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
  assignments?: TaskAssignment[]
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
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('TODO')
  const [priority, setPriority] = useState('MEDIUM')
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
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
        setAssigneeIds(
          data.assignments?.length
            ? data.assignments.map((a) => a.user.id)
            : data.assigneeId ? [data.assigneeId] : []
        )
        setDueDate(data.dueDate ? data.dueDate.slice(0, 10) : '')
      }
    } finally {
      setLoading(false)
    }
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

  useEffect(() => {
    if (open && taskId) {
      fetchTask()
      fetchAttachments()
      setConfirmDelete(false)
    }
  }, [open, taskId, fetchTask, fetchAttachments])

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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!taskId || !e.target.files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(e.target.files)) {
        // Upload to assets first to get a real URL
        const assetRes = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileUrl: URL.createObjectURL(file),
            fileSize: file.size,
            mimeType: file.type || 'application/octet-stream',
            category: file.type.startsWith('image/') ? 'image' : 'document',
          }),
        })
        const assetData = assetRes.ok ? await assetRes.json() : null
        const fileUrl = assetData?.fileUrl || URL.createObjectURL(file)

        await fetch(`/api/tasks/${taskId}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileUrl,
            fileSize: file.size,
            mimeType: file.type || 'application/octet-stream',
          }),
        })
      }
      fetchAttachments()
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!taskId) return
    await fetch(`/api/tasks/${taskId}/attachments?attachmentId=${attachmentId}`, {
      method: 'DELETE',
    })
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

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

          <MultiUserSelect
            users={teamMembers}
            selected={assigneeIds}
            onChange={setAssigneeIds}
            label="Assegnati a"
            placeholder="Seleziona assegnatari..."
          />

          <Input
            label="Scadenza"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
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

          {/* Attachments section */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium flex items-center gap-1.5">
                <Paperclip className="h-4 w-4" />
                Allegati
                {attachments.length > 0 && (
                  <span className="text-xs text-muted">({attachments.length})</span>
                )}
              </h4>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Paperclip className="h-3.5 w-3.5 mr-1" />
                  {uploading ? 'Caricamento...' : 'Allega file'}
                </Button>
              </div>
            </div>

            {attachments.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {attachments.map((att) => {
                  const isImage = att.mimeType.startsWith('image/')
                  const IconComp = isImage ? Image : FileText
                  return (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 p-2 rounded-md border border-border bg-secondary/30 group"
                    >
                      <div className="h-8 w-8 rounded bg-secondary flex items-center justify-center shrink-0">
                        <IconComp className="h-4 w-4 text-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{att.fileName}</p>
                        <p className="text-xs text-muted">
                          {formatFileSize(att.fileSize)} &middot; {att.uploadedBy.firstName} {att.uploadedBy.lastName}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-secondary transition-colors"
                          title="Scarica"
                        >
                          <Download className="h-3.5 w-3.5 text-muted" />
                        </a>
                        <button
                          onClick={() => handleDeleteAttachment(att.id)}
                          className="p-1 rounded hover:bg-destructive/10 transition-colors"
                          title="Rimuovi"
                        >
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted">Nessun allegato.</p>
            )}
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
