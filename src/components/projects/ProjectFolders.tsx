'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { FolderOpen, Plus, Pencil, Trash2, Check, X, ChevronRight, ChevronDown, GripVertical } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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

// Flatten the tree into a list of { id, parentId, sortOrder } for the batch API
function buildBatchItems(folders: Folder[]): { id: string; parentId: string | null; sortOrder: number }[] {
  const items: { id: string; parentId: string | null; sortOrder: number }[] = []
  folders.forEach((f, i) => {
    items.push({ id: f.id, parentId: f.parentId || null, sortOrder: i })
    ;(f.children ?? []).forEach((c, ci) => {
      items.push({ id: c.id, parentId: f.id, sortOrder: ci })
    })
  })
  return items
}

// ---- Sortable folder item ----
function SortableFolderItem({
  folder,
  depth,
  isExpanded,
  selectedFolderId,
  editingId,
  editName,
  editColor,
  submitting,
  overDropId,
  dragActiveId,
  onToggleExpanded,
  onSelect,
  onStartEdit,
  onStartCreateSubfolder,
  onDelete,
  onEditNameChange,
  onEditColorChange,
  onRename,
  onCancelEdit,
  children: childrenContent,
}: {
  folder: Folder
  depth: number
  isExpanded: boolean
  selectedFolderId: string | null | undefined
  editingId: string | null
  editName: string
  editColor: string
  submitting: boolean
  overDropId: string | null
  dragActiveId: string | null
  onToggleExpanded: (id: string) => void
  onSelect: (id: string | null) => void
  onStartEdit: (folder: Folder) => void
  onStartCreateSubfolder: (parentId: string) => void
  onDelete: (id: string) => void
  onEditNameChange: (v: string) => void
  onEditColorChange: (v: string) => void
  onRename: () => void
  onCancelEdit: () => void
  children?: React.ReactNode
}) {
  const hasChildren = (folder.children ?? []).length > 0
  const totalCount = getTotalTaskCount(folder)
  const isMaxDepth = depth >= 1

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: folder.id,
    data: { type: 'folder', folder, depth },
  })

  // This folder is also a drop target (to become parent)
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${folder.id}`,
    data: { type: 'folder-target', folderId: folder.id, depth },
    disabled: isMaxDepth || isDragging,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    paddingLeft: depth > 0 ? `${depth * 16}px` : undefined,
  }

  const isDropTarget = overDropId === `drop-${folder.id}` && dragActiveId !== folder.id && !isMaxDepth

  return (
    <div ref={setNodeRef} style={style}>
      <div ref={setDropRef} className="group relative">
        {editingId === folder.id ? (
          <div className="flex items-center gap-1 my-1">
            <div className="flex gap-0.5">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="w-4 h-4 rounded-full border-2 transition-transform"
                  style={{ backgroundColor: c, borderColor: editColor === c ? 'var(--color-foreground)' : 'transparent' }}
                  onClick={() => onEditColorChange(c)}
                />
              ))}
            </div>
            <Input
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              className="h-7 text-sm w-28"
              onKeyDown={(e) => e.key === 'Enter' && onRename()}
              autoFocus
            />
            <Button size="sm" onClick={onRename} disabled={submitting} className="h-7 px-1.5">
              <Check className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancelEdit} className="h-7 px-1.5">
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => onSelect(selectedFolderId === folder.id ? null : folder.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors border w-full text-left ${
              isDropTarget
                ? 'bg-primary/20 border-primary/50 ring-2 ring-primary/30'
                : selectedFolderId === folder.id
                  ? 'bg-primary/10 border-primary/30 font-medium'
                  : 'border-border hover:bg-secondary/50'
            }`}
          >
            {/* Drag handle */}
            <span
              {...attributes}
              {...listeners}
              className="p-0.5 rounded cursor-grab active:cursor-grabbing hover:bg-secondary/80 flex-shrink-0 touch-none"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3.5 w-3.5 text-muted" />
            </span>

            {hasChildren && (
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); onToggleExpanded(folder.id) }}
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
                  onClick={(e) => { e.stopPropagation(); onStartCreateSubfolder(folder.id) }}
                  className="p-0.5 rounded hover:bg-primary/10"
                  title="Aggiungi sottocartella"
                >
                  <Plus className="h-3 w-3 text-muted" />
                </span>
              )}
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); onStartEdit(folder) }}
                className="p-0.5 rounded hover:bg-primary/10"
              >
                <Pencil className="h-3 w-3 text-muted" />
              </span>
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); onDelete(folder.id) }}
                className="p-0.5 rounded hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </span>
            </span>
          </button>
        )}
      </div>
      {childrenContent}
    </div>
  )
}

// Drag overlay (ghost preview while dragging)
function DragOverlayFolder({ folder }: { folder: Folder }) {
  const totalCount = getTotalTaskCount(folder)
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-primary/50 bg-card shadow-lg w-fit max-w-xs">
      <GripVertical className="h-3.5 w-3.5 text-muted" />
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: folder.color }} />
      <span className="truncate">{folder.name}</span>
      <span className="text-xs opacity-60">({totalCount})</span>
    </div>
  )
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
  const [dragActiveId, setDragActiveId] = useState<string | null>(null)
  const [overDropId, setOverDropId] = useState<string | null>(null)
  const { confirm, confirmProps } = useConfirm()
  const savingRef = useRef(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  // Flat map of all folders by id for quick lookup
  const folderMap = useMemo(() => {
    const map = new Map<string, Folder>()
    function walk(list: Folder[]) {
      for (const f of list) {
        map.set(f.id, f)
        if (f.children) walk(f.children)
      }
    }
    walk(folders)
    return map
  }, [folders])

  // Root-level folder ids for SortableContext
  const rootIds = useMemo(() => folders.map((f) => f.id), [folders])

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function saveBatchOrder(updatedFolders: Folder[]) {
    if (savingRef.current) return
    savingRef.current = true
    try {
      const items = buildBatchItems(updatedFolders)
      await fetch(`/api/projects/${projectId}/folders`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      onFoldersChange()
    } finally {
      savingRef.current = false
    }
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

  // ---- Drag handlers ----
  function handleDragStart(event: DragStartEvent) {
    setDragActiveId(event.active.id as string)
  }

  function handleDragOver(event: DragOverEvent) {
    setOverDropId(event.over?.id as string | null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setDragActiveId(null)
    setOverDropId(null)

    if (!over || active.id === over.id) return

    const draggedId = active.id as string
    const draggedFolder = folderMap.get(draggedId)
    if (!draggedFolder) return

    const overId = over.id as string

    // Case 1: Dropped onto a folder-target (make it a child)
    if (overId.startsWith('drop-')) {
      const targetFolderId = overId.replace('drop-', '')
      const targetFolder = folderMap.get(targetFolderId)
      if (!targetFolder || targetFolderId === draggedId) return

      // Can't nest deeper than 2 levels
      if (targetFolder.parentId) return

      // Can't drop a parent folder (with children) into another folder
      if ((draggedFolder.children ?? []).length > 0 && !draggedFolder.parentId) {
        // Moving a root folder with children into another root folder — not allowed (would make 3 levels)
        return
      }

      // Build updated tree
      const newFolders = folders
        .filter((f) => f.id !== draggedId)
        .map((f) => {
          if (f.id === targetFolderId) {
            return {
              ...f,
              children: [...(f.children ?? []).filter((c) => c.id !== draggedId), { ...draggedFolder, parentId: targetFolderId, children: [] }],
            }
          }
          return {
            ...f,
            children: (f.children ?? []).filter((c) => c.id !== draggedId),
          }
        })

      saveBatchOrder(newFolders)
      setExpandedIds((prev) => new Set(prev).add(targetFolderId))
      return
    }

    // Case 2: Dropped onto another sortable item (reorder)
    const overFolder = folderMap.get(overId)
    if (!overFolder) return

    // Both at root level — simple reorder
    if (!draggedFolder.parentId && !overFolder.parentId) {
      const oldIndex = folders.findIndex((f) => f.id === draggedId)
      const newIndex = folders.findIndex((f) => f.id === overId)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = [...folders]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)
      saveBatchOrder(reordered)
      return
    }

    // Both in same parent — reorder within parent
    if (draggedFolder.parentId && draggedFolder.parentId === overFolder.parentId) {
      const parent = folders.find((f) => f.id === draggedFolder.parentId)
      if (!parent?.children) return
      const kids = [...parent.children]
      const oldIdx = kids.findIndex((c) => c.id === draggedId)
      const newIdx = kids.findIndex((c) => c.id === overId)
      if (oldIdx === -1 || newIdx === -1) return
      const [moved] = kids.splice(oldIdx, 1)
      kids.splice(newIdx, 0, moved)
      const newFolders = folders.map((f) => f.id === parent.id ? { ...f, children: kids } : f)
      saveBatchOrder(newFolders)
      return
    }

    // Dragged from child to root level (unparent)
    if (draggedFolder.parentId && !overFolder.parentId) {
      const newIndex = folders.findIndex((f) => f.id === overId)
      const newFolders = folders
        .map((f) => ({
          ...f,
          children: (f.children ?? []).filter((c) => c.id !== draggedId),
        }))
      const unparented = { ...draggedFolder, parentId: null, children: [] as Folder[] }
      newFolders.splice(newIndex, 0, unparented)
      saveBatchOrder(newFolders)
      return
    }
  }

  const draggedFolder = dragActiveId ? folderMap.get(dragActiveId) : null

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

  // Collect all sortable IDs (root + children)
  const allSortableIds = useMemo(() => {
    const ids: string[] = []
    for (const f of folders) {
      ids.push(f.id)
      for (const c of f.children ?? []) {
        ids.push(c.id)
      }
    }
    return ids
  }, [folders])

  // Root-level drop zone (for unparenting)
  const { setNodeRef: setRootDropRef } = useDroppable({
    id: 'drop-root',
    data: { type: 'root-drop' },
  })

  const handleDragEndWrapped = useCallback(handleDragEnd, [folders, folderMap, projectId, onFoldersChange])

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

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEndWrapped}
      >
        <div ref={setRootDropRef} className="space-y-1">
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

          <SortableContext items={allSortableIds} strategy={verticalListSortingStrategy}>
            {folders.map((folder) => {
              const hasChildren = (folder.children ?? []).length > 0
              const isExpanded = expandedIds.has(folder.id)

              return (
                <SortableFolderItem
                  key={folder.id}
                  folder={folder}
                  depth={0}
                  isExpanded={isExpanded}
                  selectedFolderId={selectedFolderId}
                  editingId={editingId}
                  editName={editName}
                  editColor={editColor}
                  submitting={submitting}
                  overDropId={overDropId}
                  dragActiveId={dragActiveId}
                  onToggleExpanded={toggleExpanded}
                  onSelect={onSelectFolder}
                  onStartEdit={startEdit}
                  onStartCreateSubfolder={startCreateSubfolder}
                  onDelete={handleDelete}
                  onEditNameChange={setEditName}
                  onEditColorChange={setEditColor}
                  onRename={handleRename}
                  onCancelEdit={() => setEditingId(null)}
                >
                  {hasChildren && isExpanded && (
                    <div className="mt-1 space-y-1">
                      {folder.children!.map((child) => (
                        <SortableFolderItem
                          key={child.id}
                          folder={child}
                          depth={1}
                          isExpanded={false}
                          selectedFolderId={selectedFolderId}
                          editingId={editingId}
                          editName={editName}
                          editColor={editColor}
                          submitting={submitting}
                          overDropId={overDropId}
                          dragActiveId={dragActiveId}
                          onToggleExpanded={toggleExpanded}
                          onSelect={onSelectFolder}
                          onStartEdit={startEdit}
                          onStartCreateSubfolder={startCreateSubfolder}
                          onDelete={handleDelete}
                          onEditNameChange={setEditName}
                          onEditColorChange={setEditColor}
                          onRename={handleRename}
                          onCancelEdit={() => setEditingId(null)}
                        />
                      ))}
                    </div>
                  )}
                  {creating && creatingParentId === folder.id && (
                    <div className="mt-1" style={{ paddingLeft: '16px' }}>
                      {renderCreateForm()}
                    </div>
                  )}
                </SortableFolderItem>
              )
            })}
          </SortableContext>
        </div>

        <DragOverlay dropAnimation={null}>
          {draggedFolder && <DragOverlayFolder folder={draggedFolder} />}
        </DragOverlay>
      </DndContext>

      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
