'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardCheck, MessageSquare, ChevronDown, ChevronUp, Send, AlertCircle } from 'lucide-react'
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
  asset: { id: string; fileName: string; fileUrl: string; mimeType: string }
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

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  const groupedReviews = STATUS_ORDER.reduce<Record<string, Review[]>>((acc, status) => {
    acc[status] = reviews.filter((r) => r.status === status)
    return acc
  }, {})

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
      ) : (
        <div className="space-y-8">
          {STATUS_ORDER.map((status) => {
            const statusReviews = groupedReviews[status]
            if (!statusReviews || statusReviews.length === 0) return null

            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge status={status}>
                    {STATUS_LABELS[status] || status}
                  </Badge>
                  <span className="text-sm text-muted">({statusReviews.length})</span>
                </div>

                <div className="space-y-3">
                  {statusReviews.map((review) => {
                    const isExpanded = expandedId === review.id

                    return (
                      <Card key={review.id} className="overflow-hidden">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : review.id)}
                          aria-expanded={isExpanded}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {review.asset.fileName}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted">
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
