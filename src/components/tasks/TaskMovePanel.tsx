import { useState, useEffect } from 'react'
import { ArrowRightLeft, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface TaskMovePanelProps {
  taskId: string
  currentProjectId?: string | null
  currentFolderId?: string | null
  onMoved: () => void
}

export function TaskMovePanel({ taskId, currentProjectId, currentFolderId, onMoved }: TaskMovePanelProps) {
  const [showMovePanel, setShowMovePanel] = useState(false)
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([])
  const [moveProjectId, setMoveProjectId] = useState<string>('')
  const [moveFolderId, setMoveFolderId] = useState<string>('')
  const [moving, setMoving] = useState(false)

  async function loadProjects() {
    try {
      const res = await fetch('/api/projects?limit=100')
      if (res.ok) {
        const data = await res.json()
        setProjects((data.items || data || []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })))
      }
    } catch {}
  }

  async function loadFolders(projectId: string) {
    setFolders([])
    if (!projectId) return
    try {
      const res = await fetch(`/api/projects/${projectId}/folders`)
      if (res.ok) {
        const data = await res.json()
        setFolders((data.items || data || []).map((f: { id: string; name: string }) => ({ id: f.id, name: f.name })))
      }
    } catch {}
  }

  async function handleMoveTask() {
    if (moving) return
    setMoving(true)
    try {
      const body: Record<string, unknown> = {}

      if (moveProjectId && moveProjectId !== currentProjectId) {
        body.projectId = moveProjectId
      } else if (!moveProjectId && currentProjectId) {
        body.projectId = null
      }

      const newFolderId = moveFolderId || null
      if (newFolderId !== currentFolderId) {
        body.folderId = newFolderId
      }
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setShowMovePanel(false)
        onMoved()
      }
    } finally {
      setMoving(false)
    }
  }

  if (!showMovePanel) {
    return (
      <div className="border-t border-border pt-4">
        <button
          onClick={() => {
            setShowMovePanel(true)
            setMoveProjectId(currentProjectId || '')
            setMoveFolderId(currentFolderId || '')
            loadProjects()
            if (currentProjectId) loadFolders(currentProjectId)
          }}
          className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowRightLeft className="h-4 w-4" />
          Sposta task
        </button>
      </div>
    )
  }

  return (
    <div className="border-t border-border pt-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ArrowRightLeft className="h-4 w-4" />
          Sposta Task
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Progetto destinazione</label>
          <select
            value={moveProjectId}
            onChange={(e) => {
              setMoveProjectId(e.target.value)
              setMoveFolderId('')
              loadFolders(e.target.value)
            }}
            className="w-full h-10 rounded-lg border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">-- Nessun progetto (task personale) --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {moveProjectId && folders.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              <FolderOpen className="h-3.5 w-3.5 inline mr-1" />
              Cartella (opzionale)
            </label>
            <select
              value={moveFolderId}
              onChange={(e) => setMoveFolderId(e.target.value)}
              className="w-full h-10 rounded-lg border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">-- Nessuna cartella --</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleMoveTask} disabled={moving}>
            {moving ? 'Spostamento...' : 'Sposta'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowMovePanel(false)}>
            Annulla
          </Button>
        </div>
      </div>
    </div>
  )
}
