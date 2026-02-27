'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send, Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'

interface TicketComment {
  id: string
  content: string
  author: { firstName: string; lastName: string; avatarUrl?: string | null }
  createdAt: string
}

interface TicketDetail {
  id: string
  number: string
  subject: string
  description: string
  status: string
  priority: string
  category: string
  client: { companyName: string } | null
  project: { name: string } | null
  creator: { firstName: string; lastName: string } | null
  assignee: { id: string; firstName: string; lastName: string; avatarUrl?: string | null } | null
  comments: TicketComment[]
  createdAt: string
  resolvedAt: string | null
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aperto',
  IN_PROGRESS: 'In Lavorazione',
  WAITING_CLIENT: 'In Attesa',
  RESOLVED: 'Risolto',
  CLOSED: 'Chiuso',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Bassa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Bassa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'Generale' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'billing', label: 'Fatturazione' },
  { value: 'other', label: 'Altro' },
]

const STATUS_TRANSITIONS: Record<string, { label: string; value: string }[]> = {
  OPEN: [
    { label: 'In Lavorazione', value: 'IN_PROGRESS' },
    { label: 'In Attesa', value: 'WAITING_CLIENT' },
    { label: 'Chiudi', value: 'CLOSED' },
  ],
  IN_PROGRESS: [
    { label: 'In Attesa', value: 'WAITING_CLIENT' },
    { label: 'Risolto', value: 'RESOLVED' },
    { label: 'Chiudi', value: 'CLOSED' },
  ],
  WAITING_CLIENT: [
    { label: 'In Lavorazione', value: 'IN_PROGRESS' },
    { label: 'Risolto', value: 'RESOLVED' },
    { label: 'Chiudi', value: 'CLOSED' },
  ],
  RESOLVED: [
    { label: 'Riapri', value: 'OPEN' },
    { label: 'Chiudi', value: 'CLOSED' },
  ],
  CLOSED: [
    { label: 'Riapri', value: 'OPEN' },
  ],
}

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.ticketId as string
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [updatingField, setUpdatingField] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<{ value: string; label: string }[]>([])
  const [userRole, setUserRole] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchTicket = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tickets/${ticketId}`)
      if (res.ok) {
        const data = await res.json()
        setTicket(data)
      } else {
        setError(res.status === 404 ? 'Ticket non trovato.' : 'Errore nel caricamento del ticket.')
      }
    } catch {
      setError('Errore di connessione. Riprova.')
    } finally {
      setLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    fetchTicket()
  }, [fetchTicket])

  // Load team members and user role
  useEffect(() => {
    fetch('/api/users')
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        const members = (data.items || data.users || [])
          .filter((u: { isActive: boolean }) => u.isActive)
          .map((u: { id: string; firstName: string; lastName: string }) => ({
            value: u.id,
            label: `${u.firstName} ${u.lastName}`,
          }))
        setTeamMembers(members)
      })
    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.role) setUserRole(data.user.role)
      })
      .catch(() => {})
  }, [])

  async function handleFieldUpdate(field: string, value: string | null) {
    setUpdatingField(field)
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (res.ok) fetchTicket()
    } finally {
      setUpdatingField(null)
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      })
      if (res.ok) {
        setCommentText('')
        fetchTicket()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/support')
      }
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">{error || 'Ticket non trovato.'}</p>
        <div className="flex justify-center gap-3 mt-4">
          {error && (
            <Button variant="outline" onClick={fetchTicket}>
              Riprova
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push('/support')}>
            Torna alla lista
          </Button>
        </div>
      </div>
    )
  }

  const transitions = STATUS_TRANSITIONS[ticket.status] || []

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/support')} aria-label="Torna al supporto">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-muted font-medium">#{ticket.number}</span>
            <h1 className="text-xl font-semibold">{ticket.subject}</h1>
            <Badge status={ticket.status}>
              {STATUS_LABELS[ticket.status] || ticket.status}
            </Badge>
            <Badge status={ticket.priority}>
              {PRIORITY_LABELS[ticket.priority] || ticket.priority}
            </Badge>
          </div>
        </div>
        {userRole === 'ADMIN' && (
          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteModalOpen(true)} aria-label="Elimina ticket">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: Description + Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {ticket.description && (
            <Card className="p-4">
              <h3 className="text-sm font-medium text-muted mb-2">Descrizione</h3>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </Card>
          )}

          {/* Status Actions */}
          {transitions.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {transitions.map((transition) => (
                <Button
                  key={transition.value}
                  variant="outline"
                  size="sm"
                  disabled={updatingField === 'status'}
                  onClick={() => handleFieldUpdate('status', transition.value)}
                >
                  {transition.label}
                </Button>
              ))}
            </div>
          )}

          {/* Comments Thread */}
          <div>
            <h3 className="text-sm font-medium text-muted mb-4">
              Commenti ({ticket.comments.length})
            </h3>

            {ticket.comments.length > 0 ? (
              <div className="space-y-4">
                {ticket.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar
                      name={`${comment.author.firstName} ${comment.author.lastName}`}
                      src={comment.author.avatarUrl}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0 bg-secondary/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {comment.author.firstName} {comment.author.lastName}
                        </span>
                        <span className="text-xs text-muted">
                          {new Date(comment.createdAt).toLocaleString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted py-4">Nessun commento ancora.</p>
            )}

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mt-4 flex gap-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Scrivi un commento..."
                rows={2}
                className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              />
              <Button
                type="submit"
                size="icon"
                disabled={submitting || !commentText.trim()}
                aria-label="Invia commento"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Sidebar: Info + Editable fields */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-medium text-muted mb-3">Dettagli</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted">Cliente</p>
                <p className="font-medium">{ticket.client?.companyName || '—'}</p>
              </div>
              <div>
                <p className="text-muted">Progetto</p>
                <p className="font-medium">{ticket.project?.name || '—'}</p>
              </div>
              <div>
                <p className="text-muted">Creato da</p>
                <p className="font-medium">
                  {ticket.creator
                    ? `${ticket.creator.firstName} ${ticket.creator.lastName}`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted">Creato il</p>
                <p className="font-medium">
                  {new Date(ticket.createdAt).toLocaleDateString('it-IT')}
                </p>
              </div>
              {ticket.resolvedAt && (
                <div>
                  <p className="text-muted">Risolto il</p>
                  <p className="font-medium">
                    {new Date(ticket.resolvedAt).toLocaleDateString('it-IT')}
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium text-muted mb-3">Gestione</h3>
            <div className="space-y-4">
              {/* Assignee */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  <UserPlus className="h-3 w-3 inline mr-1" />
                  Assegnato a
                </label>
                <Select
                  options={[{ value: '', label: 'Non assegnato' }, ...teamMembers]}
                  value={ticket.assignee?.id || ''}
                  onChange={(e) => handleFieldUpdate('assigneeId', e.target.value || null)}
                  disabled={updatingField === 'assigneeId'}
                  className="w-full"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Priorità</label>
                <Select
                  options={PRIORITY_OPTIONS}
                  value={ticket.priority}
                  onChange={(e) => handleFieldUpdate('priority', e.target.value)}
                  disabled={updatingField === 'priority'}
                  className="w-full"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Categoria</label>
                <Select
                  options={CATEGORY_OPTIONS}
                  value={ticket.category}
                  onChange={(e) => handleFieldUpdate('category', e.target.value)}
                  disabled={updatingField === 'category'}
                  className="w-full"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Elimina Ticket">
        <p className="text-sm text-muted mb-4">
          Sei sicuro di voler eliminare il ticket <strong>#{ticket.number}</strong>? Questa azione è irreversibile.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Annulla</Button>
          <Button variant="destructive" loading={deleting} onClick={handleDelete}>Elimina</Button>
        </div>
      </Modal>
    </div>
  )
}
