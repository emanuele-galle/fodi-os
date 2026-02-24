'use client'

import { useState } from 'react'
import { FolderOpen, Plus, Pencil, Trash2, Check, X, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'

interface Folder {
  id: string
  name: string
  description: string | null
  color: string
  sortOrder: number
  parentId?: string | null
  _count?: { tasks: number }
  children?: Folder[]
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

function getTotalTaskCount(folder: Folder): number {
  const own = folder._count?.tasks ?? 0
  const childCount = (folder.children ?? []).reduce((s, c) => s + getTotalTaskCount(c), 0)
  return own + childCount
}

function getAllFoldersTotalCount(folders: Folder[]): number {
  return folders.reduce((s, f) => s + getTotalTaskCount(f), 0)
}

export function ProjectFolders({ projectId, folders, onFoldersChange, selectedFolderId, onSelectFolder }: ProjectFoldersProps) {
  const [creating, setCreating] = useState(false)
  const [creatingParentId, setCreatingParentId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6366F1')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const { confirm, confirmProps } = useConfirm()

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { name: newName.trim(), color: newColor }
      if (creatingParentId) body.parentId = creatingParentId
      const res = await fetch(`/api/projects/${projectId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setNewName('')
        setNewColor('#6366F1')
        setCreating(false)
        setCreatingParentId(null)
        if (creatingParentId) {
          setExpandedIds((prev) => new Set(prev).add(creatingParentId))
        }
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
    const ok = await confirm({ message: 'Eliminare questa cartella? Le task al suo interno non verranno eliminate.', variant: 'danger' })
    if (!ok) return
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

  function startCreateSubfolder(parentId: string) {
    setCreatingParentId(parentId)
    setCreating(true)
    setNewName('')
    setNewColor('#6366F1')
    setExpandedIds((prev) => new Set(prev).add(parentId))
  }

  function renderCreateForm() {
    if (!creating) return null
    return (
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
          placeholder={creatingParentId ? 'Nome sottocartella...' : 'Nome cartella...'}
          className="h-8 text-sm flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          autoFocus
        />
        <Button size="sm" onClick={handleCreate} disabled={submitting || !newName.trim()} className="h-8 px-2">
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setCreatingParentId(null) }} className="h-8 px-2">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  function renderFolder(folder: Folder, depth: number = 0) {
    const hasChildren = (folder.children ?? []).length > 0
    const isExpanded = expandedIds.has(folder.id)
    const totalCount = getTotalTaskCount(folder)
    const isMaxDepth = depth >= 1 // Max 2 levels (0 and 1)

    return (
      <div key={folder.id} style={{ paddingLeft: depth > 0 ? `${depth * 16}px` : undefined }}>
        <div className="group relative">
          {editingId === folder.id ? (
            <div className="flex items-center gap-1 my-1">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors border w-full text-left ${
                selectedFolderId === folder.id
                  ? 'bg-primary/10 border-primary/30 font-medium'
                  : 'border-border hover:bg-secondary/50'
              }`}
            >
              {hasChildren && (
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); toggleExpanded(folder.id) }}
                  className="p-0.5 rounded hover:bg-primary/10 flex-shrink-0"
                >
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </span>
              )}
              {!hasChildren && depth > 0 && <span className="w-4" />}
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: folder.color }}
              />
              <span className="truncate">{folder.name}</span>
              <span className="text-xs opacity-60 flex-shrink-0">({totalCount})</span>
              <span className="hidden group-hover:flex items-center gap-0.5 ml-auto flex-shrink-0">
                {!isMaxDepth && (
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); startCreateSubfolder(folder.id) }}
                    className="p-0.5 rounded hover:bg-primary/10"
                    title="Aggiungi sottocartella"
                  >
                    <Plus className="h-3 w-3 text-muted" />
                  </span>
                )}
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
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {folder.children!.map((child) => renderFolder(child, depth + 1))}
          </div>
        )}
        {creating && creatingParentId === folder.id && (
          <div className="mt-1" style={{ paddingLeft: `${(depth + 1) * 16}px` }}>
            {renderCreateForm()}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted flex items-center gap-1.5">
          <FolderOpen className="h-4 w-4" />
          Cartelle
        </h3>
        <Button variant="ghost" size="sm" onClick={() => { setCreating(!creating); setCreatingParentId(null) }} className="h-7 px-2">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {creating && !creatingParentId && renderCreateForm()}

      <div className="space-y-1">
        <button
          onClick={() => onSelectFolder(null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors border w-full text-left ${
            selectedFolderId === null
              ? 'bg-primary/10 border-primary/30 text-primary font-medium'
              : 'border-border hover:bg-secondary/50 text-muted'
          }`}
        >
          Tutte
          <span className="text-xs opacity-60">({getAllFoldersTotalCount(folders)})</span>
        </button>

        {folders.map((folder) => renderFolder(folder))}
      </div>
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
