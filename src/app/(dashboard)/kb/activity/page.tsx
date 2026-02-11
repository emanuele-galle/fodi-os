'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Activity } from 'lucide-react'
import { WikiActivityFeed } from '@/components/kb/WikiActivityFeed'
import type { ActivityItem } from '@/components/kb/WikiActivityFeed'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

export default function KBActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/wiki/activity')
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => setItems(data.items || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/kb"
          className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Knowledge Base
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Attivita Recenti</h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Nessuna attivita"
          description="Le modifiche e i commenti alle pagine della Knowledge Base appariranno qui."
        />
      ) : (
        <div className="border border-border rounded-lg">
          <WikiActivityFeed items={items} />
        </div>
      )}
    </div>
  )
}
