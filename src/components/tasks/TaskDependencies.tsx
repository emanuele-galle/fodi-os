'use client'

import { useState, useEffect, useCallback } from 'react'
import { Link2, X, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface TaskDep {
  id: string
  dependsOnId: string
  type: string
  dependsOn: {
    id: string
    title: string
    status: string
  }
}

interface TaskSearchResult {
  id: string
  title: string
  status: string
}

const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
  DONE: { icon: CheckCircle, color: 'text-green-500' },
  IN_PROGRESS: { icon: Clock, color: 'text-blue-500' },
  TODO: { icon: AlertCircle, color: 'text-muted' },
  BLOCKED: { icon: AlertCircle, color: 'text-destructive' },
}

export function TaskDependencies({ taskId }: { taskId: string }) {
  const [deps, setDeps] = useState<TaskDep[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<TaskSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const loadDeps = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/dependencies`)
      if (res.ok) setDeps(await res.json())
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => { loadDeps() }, [loadDeps])

  useEffect(() => {
    if (!search.trim() || search.length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/tasks?search=${encodeURIComponent(search)}&limit=5`)
        if (res.ok) {
          const data = await res.json()
          const items = (data.items || data || []) as TaskSearchResult[]
          setResults(items.filter((t: TaskSearchResult) => t.id !== taskId && !deps.some((d) => d.dependsOnId === t.id)))
        }
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search, taskId, deps])

  async function addDep(dependsOnId: string) {
    const res = await fetch(`/api/tasks/${taskId}/dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dependsOnId }),
    })
    if (res.ok) {
      await loadDeps()
      setSearch('')
      setResults([])
      setAdding(false)
    }
  }

  async function removeDep(dependsOnId: string) {
    const res = await fetch(`/api/tasks/${taskId}/dependencies?dependsOnId=${dependsOnId}`, {
      method: 'DELETE',
    })
    if (res.ok) setDeps((prev) => prev.filter((d) => d.dependsOnId !== dependsOnId))
  }

  if (loading) return <div className="animate-pulse text-sm text-muted py-2">Caricamento dipendenze...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Link2 className="h-4 w-4" />
          Dipendenze ({deps.length})
        </div>
        <Button variant="ghost" size="sm" onClick={() => setAdding(!adding)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Aggiungi
        </Button>
      </div>

      {adding && (
        <div className="mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca task..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
            autoFocus
          />
          {searching && <p className="text-xs text-muted mt-1">Ricerca...</p>}
          {results.length > 0 && (
            <div className="mt-1 border border-border/30 rounded-lg overflow-hidden bg-card">
              {results.map((task) => (
                <button
                  key={task.id}
                  onClick={() => addDep(task.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 transition-colors flex items-center gap-2"
                >
                  <span className="truncate flex-1">{task.title}</span>
                  <span className="text-xs text-muted">{task.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {deps.length === 0 ? (
        <p className="text-sm text-muted">Nessuna dipendenza</p>
      ) : (
        <div className="space-y-1">
          {deps.map((dep) => {
            const config = statusConfig[dep.dependsOn.status] || statusConfig.TODO
            const Icon = config.icon
            return (
              <div key={dep.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 group">
                <Icon className={cn('h-4 w-4 flex-shrink-0', config.color)} />
                <span className="text-sm truncate flex-1">{dep.dependsOn.title}</span>
                <span className="text-xs text-muted">{dep.dependsOn.status}</span>
                <button
                  onClick={() => removeDep(dep.dependsOnId)}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-destructive transition-all p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
