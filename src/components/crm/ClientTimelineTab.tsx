'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

interface ClientTimelineTabProps {
  clientId: string
}

export function ClientTimelineTab({ clientId }: ClientTimelineTabProps) {
  const ICON_MAP: Record<string, string> = { interaction: '💬', activity: '📝', task: '✅', deal: '💰', document: '📎' }
  const [items, setItems] = useState<Array<{ id: string; type: string; title: string; description?: string; date: string; metadata?: Record<string, unknown>; user?: { firstName: string; lastName: string } }>>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const fetchTimeline = useCallback((p: number) => {
    setLoading(p === 1)
    fetch(`/api/clients/${clientId}/activity?page=${p}&limit=30`)
      .then(r => r.json())
      .then(data => {
        const newItems = data.items || []
        if (p === 1) setItems(newItems); else setItems(prev => [...prev, ...newItems])
        setHasMore(newItems.length === 30)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => { fetchTimeline(1) }, [fetchTimeline])

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
  if (items.length === 0) return <EmptyState icon={Clock} title="Nessuna attività registrata" description="La cronologia completa delle attività apparirà qui." />

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border/30" />
      <div className="space-y-4">
        {items.map(item => (
          <div key={`${item.type}-${item.id}`} className="flex gap-3 pl-2">
            <div className="relative z-10 flex-shrink-0 w-5 h-5 rounded-full bg-card border border-border/50 flex items-center justify-center text-xs">
              {ICON_MAP[item.type] || '•'}
            </div>
            <div className="flex-1 min-w-0 -mt-0.5">
              <p className="text-sm font-medium">{item.title}</p>
              {item.description && <p className="text-xs text-muted mt-0.5 line-clamp-2">{item.description}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted">{new Date(item.date).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                {item.user && <span className="text-xs text-muted">· {item.user.firstName} {item.user.lastName}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => { const next = page + 1; setPage(next); fetchTimeline(next) }}
          className="mt-4 w-full text-center text-sm text-primary hover:text-primary/80 font-medium py-2"
        >
          Carica altri...
        </button>
      )}
    </div>
  )
}
