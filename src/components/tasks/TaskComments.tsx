import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import type { Comment } from './task-detail-types'

interface TaskCommentsProps {
  taskId: string
  comments: Comment[]
  highlightCommentId?: string | null
  onCommentAdded: () => void
}

export function TaskComments({ taskId, comments, highlightCommentId, onCommentAdded }: TaskCommentsProps) {
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)

  async function handleAddComment() {
    if (!commentText.trim() || sendingComment) return
    setSendingComment(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      })
      if (res.ok) {
        setCommentText('')
        onCommentAdded()
      }
    } finally {
      setSendingComment(false)
    }
  }

  return (
    <div className="border-t border-border pt-4">
      <h4 className="text-sm font-medium mb-3">Commenti</h4>
      {comments && comments.length > 0 ? (
        <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} id={`comment-${c.id}`} className="flex gap-3 transition-colors duration-500 rounded-md p-1 -m-1">
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
          className="flex-1 h-11 md:h-9 rounded-md border border-border bg-transparent px-3 text-base md:text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <Button
          size="sm"
          onClick={handleAddComment}
          disabled={!commentText.trim() || sendingComment}
          aria-label="Invia commento"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
