'use client'

import { useState, useEffect, useCallback } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { timeAgo } from '@/lib/utils'

interface CommentAuthor {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
}

interface WikiComment {
  id: string
  content: string
  createdAt: string
  author: CommentAuthor
}

export function WikiPageComments({ pageId }: { pageId: string }) {
  const [comments, setComments] = useState<WikiComment[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/wiki/${pageId}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.items || [])
      }
    } finally {
      setLoading(false)
    }
  }, [pageId])

  useEffect(() => {
    setLoading(true)
    fetchComments()
  }, [fetchComments])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/wiki/${pageId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })
      if (res.ok) {
        setContent('')
        fetchComments()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-6 pt-4 border-t border-border">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Commenti {!loading && comments.length > 0 && `(${comments.length})`}
      </h3>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar
                src={comment.author.avatarUrl}
                name={`${comment.author.firstName} ${comment.author.lastName}`}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {comment.author.firstName} {comment.author.lastName}
                  </span>
                  <span className="text-xs text-muted">{timeAgo(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-foreground/80 mt-0.5 whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))}

          {comments.length === 0 && (
            <p className="text-sm text-muted">Nessun commento ancora.</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Scrivi un commento..."
          rows={2}
          className="flex-1 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
        <Button type="submit" size="sm" disabled={submitting || !content.trim()} className="self-end">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
