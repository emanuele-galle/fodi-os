'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
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
  assignee: { firstName: string; lastName: string; avatarUrl?: string | null } | null
  comments: TicketComment[]
  createdAt: string
  resolvedAt: string | null
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  OPEN: 'destructive',
  IN_PROGRESS: 'warning',
  WAITING_CLIENT: 'default',
  RESOLVED: 'success',
  CLOSED: 'outline',
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aperto',
  IN_PROGRESS: 'In Lavorazione',
  WAITING_CLIENT: 'In Attesa',
  RESOLVED: 'Risolto',
  CLOSED: 'Chiuso',
}

const PRIORITY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  LOW: 'outline',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'destructive',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Bassa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

const STATUS_TRANSITIONS: { label: string; value: string }[] = [
  { label: 'In Lavorazione', value: 'IN_PROGRESS' },
  { label: 'In Attesa', value: 'WAITING_CLIENT' },
  { label: 'Risolto', value: 'RESOLVED' },
  { label: 'Chiudi', value: 'CLOSED' },
]

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.ticketId as string
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const fetchTicket = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/tickets/${ticketId}`)
      if (res.ok) {
        const data = await res.json()
        setTicket(data)
      }
    } finally {
      setLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    fetchTicket()
  }, [fetchTicket])

  async function handleStatusChange(newStatus: string) {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) fetchTicket()
    } finally {
      setUpdatingStatus(false)
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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Ticket non trovato.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/support')}>
          Torna alla lista
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/support')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-muted font-medium">#{ticket.number}</span>
            <h1 className="text-xl font-bold">{ticket.subject}</h1>
            <Badge variant={STATUS_BADGE[ticket.status] || 'default'}>
              {STATUS_LABELS[ticket.status] || ticket.status}
            </Badge>
            <Badge variant={PRIORITY_BADGE[ticket.priority] || 'default'}>
              {PRIORITY_LABELS[ticket.priority] || ticket.priority}
            </Badge>
            {ticket.assignee && (
              <Avatar
                name={`${ticket.assignee.firstName} ${ticket.assignee.lastName}`}
                src={ticket.assignee.avatarUrl}
                size="sm"
              />
            )}
          </div>
        </div>
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
          <div className="flex gap-2 flex-wrap">
            {STATUS_TRANSITIONS.filter((t) => t.value !== ticket.status).map((transition) => (
              <Button
                key={transition.value}
                variant="outline"
                size="sm"
                disabled={updatingStatus}
                onClick={() => handleStatusChange(transition.value)}
              >
                {transition.label}
              </Button>
            ))}
          </div>

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
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Sidebar: Info */}
        <div>
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
                <p className="text-muted">Assegnato a</p>
                <p className="font-medium">
                  {ticket.assignee
                    ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}`
                    : 'Non assegnato'}
                </p>
              </div>
              <div>
                <p className="text-muted">Categoria</p>
                <p className="font-medium capitalize">{ticket.category || '—'}</p>
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
        </div>
      </div>
    </div>
  )
}
