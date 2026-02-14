'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, MessageSquare, ChevronDown, ChevronUp, Send, AlertCircle, Film } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

interface ReviewComment {
  id: string
  content: string
  author: { firstName: string; lastName: string; avatarUrl?: string | null }
  createdAt: string
}

interface Review {
  id: string
  status: string
  dueDate: string | null
  asset: { id: string; fileName: string; fileUrl: string; mimeType: string; category?: string }
  comments: ReviewComment[]
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'In Attesa',
  IN_REVIEW: 'In Revisione',
  APPROVED: 'Approvato',
  CHANGES_REQUESTED: 'Modifiche Richieste',
}

const STATUS_ORDER = ['PENDING', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED']

const STATUS_TABS = [
  { value: '', label: 'Tutti' },
  { value: 'PENDING', label: 'In Attesa' },
  { value: 'IN_REVIEW', label: 'In Revisione' },
  { value: 'CHANGES_REQUESTED', label: 'Modifiche Richieste' },
  { value: 'APPROVED', label: 'Approvato' },
]

const STATUS_TRANSITIONS: Record<string, { label: string; newStatus: string }[]> = {
  PENDING: [{ label: 'Inizia Revisione', newStatus: 'IN_REVIEW' }],
  IN_REVIEW: [
    { label: 'Approva', newStatus: 'APPROVED' },
    { label: 'Richiedi Modifiche', newStatus: 'CHANGES_REQUESTED' },
  ],
  CHANGES_REQUESTED: [{ label: 'Riprendi Revisione', newStatus: 'IN_REVIEW' }],
  APPROVED: [],
}

export default function ReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeStatus, setActiveStatus] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/assets/reviews')
      if (res.ok) {
        const data = await res.json()
        setReviews(data.items || [])
      } else {
        setFetchError('Errore nel caricamento delle review')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento delle review')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  async function handleAddComment(reviewId: string) {
    if (!commentText.trim()) return
    setSubmitting(true)
    setCommentError(null)
    try {
      const res = await fetch(`/api/assets/${reviewId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      })
      if (res.ok) {
        setCommentText('')
        fetchReviews()
      } else {
        setCommentError('Errore nell\'invio del commento')
      }
    } catch {
      setCommentError('Errore di rete')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleChangeStatus(review: Review, newStatus: string) {
    setUpdatingStatus(review.id)
    try {
      const res = await fetch(`/api/assets/${review.asset.id}/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setReviews((prev) =>
          prev.map((r) => (r.id === review.id ? { ...r, status: newStatus } : r))
        )
      }
    } catch {
      // silently fail
    } finally {
      setUpdatingStatus(null)
    }
  }

  const filteredReviews = activeStatus
    ? reviews.filter((r) => r.status === activeStatus)
    : reviews

  const countByStatus = (status: string) =>
    status === '' ? reviews.length : reviews.filter((r) => r.status === status).length

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ClipboardCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Revisioni</h1>
            <p className="text-sm text-muted">Approvazione e feedback sui contenuti</p>
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchReviews()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* Status Tabs */}
      {!loading && reviews.length > 0 && (
        <div className="flex gap-0 border-b border-border mb-6 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={activeStatus === tab.value}
              onClick={() => setActiveStatus(tab.value)}
              className={`px-4 py-2 min-h-[44px] text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap touch-manipulation ${
                activeStatus === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-70">({countByStatus(tab.value)})</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Nessuna review trovata"
          description="Le review degli asset appariranno qui quando saranno create."
        />
      ) : filteredReviews.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Nessuna review in questo stato"
          description="Non ci sono review con lo stato selezionato."
        />
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((review) => {
            const isExpanded = expandedId === review.id
            const transitions = STATUS_TRANSITIONS[review.status] || []

            return (
              <Card key={review.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : review.id)}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Asset Thumbnail */}
                    {review.asset.mimeType?.startsWith('image/') && review.asset.fileUrl ? (
                      <div className="h-10 w-10 rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={review.asset.fileUrl}
                          alt={review.asset.fileName}
                          width={40}
                          height={40}
                          className="h-10 w-10 object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded bg-secondary/50 flex items-center justify-center flex-shrink-0">
                        <Film className="h-5 w-5 text-muted" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium text-sm truncate text-primary hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push('/content/assets')
                        }}
                      >
                        {review.asset.fileName}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                        <Badge status={review.status}>
                          {STATUS_LABELS[review.status] || review.status}
                        </Badge>
                        {review.dueDate && (
                          <span>
                            Scadenza: {new Date(review.dueDate).toLocaleDateString('it-IT')}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {review.comments.length} commenti
                        </span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-border p-4">
                    {/* Status Actions */}
                    {transitions.length > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs text-muted font-medium">Azioni:</span>
                        {transitions.map((t) => (
                          <Button
                            key={t.newStatus}
                            size="sm"
                            variant={t.newStatus === 'APPROVED' ? 'default' : 'outline'}
                            onClick={() => handleChangeStatus(review, t.newStatus)}
                            disabled={updatingStatus === review.id}
                          >
                            {updatingStatus === review.id ? '...' : t.label}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Comments Thread */}
                    {review.comments.length > 0 ? (
                      <div className="space-y-3 mb-4">
                        {review.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <Avatar
                              name={`${comment.author.firstName} ${comment.author.lastName}`}
                              src={comment.author.avatarUrl}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {comment.author.firstName} {comment.author.lastName}
                                </span>
                                <span className="text-xs text-muted">
                                  {new Date(comment.createdAt).toLocaleDateString('it-IT', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="text-sm mt-1">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted mb-4">Nessun commento ancora.</p>
                    )}

                    {/* Add Comment */}
                    {commentError && expandedId === review.id && (
                      <div className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{commentError}</div>
                    )}
                    <div className="flex gap-2">
                      <textarea
                        value={expandedId === review.id ? commentText : ''}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Aggiungi un commento..."
                        rows={2}
                        className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      />
                      <Button
                        size="icon"
                        onClick={() => handleAddComment(review.id)}
                        disabled={submitting || !commentText.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
