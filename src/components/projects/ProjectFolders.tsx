'use client'

import { useState } from 'react'
import { FolderOpen, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'

interface Folder {
  id: string
  name: string
  description: string | null
  color: string
  sortOrder: number
  _count?: { tasks: number }
}

interface ProjectFoldersProps {
  projectId: string
  folders: Folder[]
  onFoldersChange: () => void
  selectedFolderId?: string | null
  onSelectFolder: (folderId: string | null) => void
}

const FOLDER_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
  '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
]

export function ProjectFolders({ projectId, folders, onFoldersChange, selectedFolderId, onSelectFolder }: ProjectFoldersProps) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6366F1')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate() {
    if (!newName.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      })
      if (res.ok) {
        setNewName('')
        setNewColor('#6366F1')
        setCreating(false)
        onFoldersChange()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRename() {
    if (!editingId || !editName.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/folders`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, name: editName.trim(), color: editColor }),
      })
      if (res.ok) {
        setEditingId(null)
        onFoldersChange()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(folderId: string) {
    if (!confirm('Eliminare questa cartella? Le task al suo interno non verranno eliminate.')) return
    const res = await fetch(`/api/projects/${projectId}/folders`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: folderId }),
    })
    if (res.ok) {
      if (selectedFolderId === folderId) onSelectFolder(null)
      onFoldersChange()
    }
  }

  function startEdit(folder: Folder) {
    setEditingId(folder.id)
    setEditName(folder.name)
    setEditColor(folder.color)
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted flex items-center gap-1.5">
          <FolderOpen className="h-4 w-4" />
          Cartelle
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setCreating(!creating)} className="h-7 px-2">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {creating && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex gap-1">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="w-5 h-5 rounded-full border-2 transition-transform"
                style={{ backgroundColor: c, borderColor: newColor === c ? 'var(--color-foreground)' : 'transparent' }}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome cartella..."
            className="h-8 text-sm flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <Button size="sm" onClick={handleCreate} disabled={submitting || !newName.trim()} className="h-8 px-2">
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCreating(false)} className="h-8 px-2">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelectFolder(null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors border ${
            selectedFolderId === null
              ? 'bg-primary/10 border-primary/30 text-primary font-medium'
              : 'border-border hover:bg-secondary/50 text-muted'
          }`}
        >
          Tutte
          <span className="text-xs opacity-60">({folders.reduce((s, f) => s + (f._count?.tasks ?? 0), 0)})</span>
        </button>

        {folders.map((folder) => (
          <div key={folder.id} className="group relative">
            {editingId === folder.id ? (
              <div className="flex items-center gap-1">
                <div className="flex gap-0.5">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="w-4 h-4 rounded-full border-2 transition-transform"
                      style={{ backgroundColor: c, borderColor: editColor === c ? 'var(--color-foreground)' : 'transparent' }}
                      onClick={() => setEditColor(c)}
                    />
                  ))}
                </div>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-7 text-sm w-28"
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                  autoFocus
                />
                <Button size="sm" onClick={handleRename} disabled={submitting} className="h-7 px-1.5">
                  <Check className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="h-7 px-1.5">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => onSelectFolder(selectedFolderId === folder.id ? null : folder.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors border ${
                  selectedFolderId === folder.id
                    ? 'bg-primary/10 border-primary/30 font-medium'
                    : 'border-border hover:bg-secondary/50'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: folder.color }}
                />
                {folder.name}
                <span className="text-xs opacity-60">({folder._count?.tasks ?? 0})</span>
                <span className="hidden group-hover:flex items-center gap-0.5 ml-1">
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); startEdit(folder) }}
                    className="p-0.5 rounded hover:bg-primary/10"
                  >
                    <Pencil className="h-3 w-3 text-muted" />
                  </span>
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(folder.id) }}
                    className="p-0.5 rounded hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </span>
                </span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
