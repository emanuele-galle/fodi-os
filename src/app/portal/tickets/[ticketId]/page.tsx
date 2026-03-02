'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send, AlertTriangle, Paperclip, FileText, Download } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Avatar'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'

interface Attachment {
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
}

interface Comment {
  id: string
  content: string
  attachments: Attachment[] | null
  createdAt: string
  author: {
    id: string
    firstName: string
    lastName: string
    role: string
  }
}

interface TicketDetail {
  id: string
  number: string
  subject: string
  description: string
  status: string
  priority: string
  category: string
  createdAt: string
  updatedAt: string
  project: { id: string; name: string } | null
  comments: Comment[]
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aperto',
  IN_PROGRESS: 'In lavorazione',
  WAITING_CLIENT: 'Risposta richiesta',
  RESOLVED: 'Risolto',
  CLOSED: 'Chiuso',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Bassa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Generale',
  bug: 'Problema / Bug',
  feature: 'Nuova funzionalità',
  billing: 'Fatturazione',
  other: 'Altro',
}

export default function PortalTicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>()
  const router = useRouter()
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // Get current user ID
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user?.id) setCurrentUserId(data.user.id)
      })
      .catch(() => {})
  }, [])

  const fetchTicket = useCallback(() => {
    fetch(`/api/portal/tickets/${ticketId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setTicket(data)
      })
      .finally(() => setLoading(false))
  }, [ticketId])

  useEffect(() => {
    fetchTicket()
  }, [fetchTicket])

  useRealtimeRefresh('ticket', fetchTicket)

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.comments.length])

  async function handleSendComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || sending) return
    setSending(true)

    try {
      const res = await fetch(`/api/portal/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      })

      if (res.ok) {
        setNewComment('')
        fetchTicket()
      }
    } catch {
      // Silently fail
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ticket non trovato</p>
      </div>
    )
  }

  const isResolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'

  return (
    <div>
      <button
        onClick={() => router.push('/portal/tickets')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Torna ai ticket
      </button>

      {/* Waiting client banner */}
      {ticket.status === 'WAITING_CLIENT' && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">Il nostro team è in attesa di una tua risposta</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content: description + comments */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">{ticket.number}</span>
              <Badge status={ticket.status}>
                {STATUS_LABELS[ticket.status] || ticket.status}
              </Badge>
            </div>
            <h1 className="text-xl font-bold">{ticket.subject}</h1>
          </div>

          {/* Description */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
              <p className="text-xs text-muted-foreground mt-3">
                Aperto il {new Date(ticket.createdAt).toLocaleDateString('it-IT', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </CardContent>
          </Card>

          {/* Comments thread */}
          {ticket.comments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Conversazione</h3>
              {ticket.comments.map((comment) => {
                const isOwn = comment.author.id === currentUserId
                const authorName = `${comment.author.firstName} ${comment.author.lastName}`
                return (
                  <div
                    key={comment.id}
                    className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                  >
                    {!isOwn && (
                      <Avatar name={authorName} size="sm" className="shrink-0 mt-1" />
                    )}
                    <div className={`max-w-[80%] ${isOwn ? 'text-right' : ''}`}>
                      <div
                        className={`rounded-lg p-3 ${
                          isOwn
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {!isOwn && (
                          <p className="text-xs font-medium mb-1 opacity-70">{authorName}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                        {/* Attachments */}
                        {comment.attachments && (comment.attachments as Attachment[]).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {(comment.attachments as Attachment[]).map((att, i) => (
                              <a
                                key={i}
                                href={att.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 text-xs rounded px-2 py-1 ${
                                  isOwn ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-background hover:bg-secondary'
                                } transition-colors`}
                              >
                                <FileText className="h-3 w-3 shrink-0" />
                                <span className="truncate">{att.fileName}</span>
                                <Download className="h-3 w-3 shrink-0 ml-auto" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className={`text-[10px] text-muted-foreground mt-1 ${isOwn ? 'text-right' : ''}`}>
                        {new Date(comment.createdAt).toLocaleDateString('it-IT', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={commentsEndRef} />
            </div>
          )}

          {/* Reply form */}
          {!isResolved && (
            <form onSubmit={handleSendComment} className="flex gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Scrivi una risposta..."
                rows={2}
                className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSendComment(e)
                  }
                }}
              />
              <Button type="submit" size="icon" disabled={sending || !newComment.trim()} className="shrink-0 self-end">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}

          {isResolved && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Questo ticket è stato {ticket.status === 'RESOLVED' ? 'risolto' : 'chiuso'}.
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div>
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">Dettagli</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stato</span>
                  <Badge status={ticket.status}>
                    {STATUS_LABELS[ticket.status] || ticket.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priorità</span>
                  <Badge status={ticket.priority}>
                    {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Categoria</span>
                  <span>{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
                </div>
                {ticket.project && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Progetto</span>
                    <span className="font-medium">{ticket.project.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Creato</span>
                  <span>{new Date(ticket.createdAt).toLocaleDateString('it-IT')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aggiornato</span>
                  <span>{new Date(ticket.updatedAt).toLocaleDateString('it-IT')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
