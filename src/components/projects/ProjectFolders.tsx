'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { FolderOpen, Plus, Pencil, Trash2, Check, X, ChevronRight, ChevronDown, GripVertical } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
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

// Flattened item for the sortable list
interface FlatItem {
  id: string
  folder: Folder
  parentId: string | null
  depth: number
}

const FOLDER_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
  '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
]

const INDENT_PX = 24
const NEST_HOVER_MS = 600 // Hold over a folder for 600ms to nest

function getTotalTaskCount(folder: Folder): number {
  const own = folder._count?.tasks ?? 0
  const childCount = (folder.children ?? []).reduce((s, c) => s + getTotalTaskCount(c), 0)
  return own + childCount
}

function getAllFoldersTotalCount(folders: Folder[]): number {
  return folders.reduce((s, f) => s + getTotalTaskCount(f), 0)
}

// Flatten the tree into a sortable list
function flattenTree(folders: Folder[], expandedIds: Set<string>): FlatItem[] {
  const items: FlatItem[] = []
  for (const f of folders) {
    items.push({ id: f.id, folder: f, parentId: f.parentId || null, depth: 0 })
    if (expandedIds.has(f.id)) {
      for (const c of f.children ?? []) {
        items.push({ id: c.id, folder: c, parentId: f.id, depth: 1 })
      }
    }
  }
  return items
}

// Build batch items for the API
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

// ---- Sortable folder row ----
function SortableFolderRow({
  item,
  isExpanded,
  selectedFolderId,
  editingId,
  editName,
  editColor,
  submitting,
  isNestTarget,
  onToggleExpanded,
  onSelect,
  onStartEdit,
  onStartCreateSubfolder,
  onDelete,
  onEditNameChange,
  onEditColorChange,
  onRename,
  onCancelEdit,
}: {
  item: FlatItem
  isExpanded: boolean
  selectedFolderId: string | null | undefined
  editingId: string | null
  editName: string
  editColor: string
  submitting: boolean
  isNestTarget: boolean
  onToggleExpanded: (id: string) => void
  onSelect: (id: string | null) => void
  onStartEdit: (folder: Folder) => void
  onStartCreateSubfolder: (parentId: string) => void
  onDelete: (id: string) => void
  onEditNameChange: (v: string) => void
  onEditColorChange: (v: string) => void
  onRename: () => void
  onCancelEdit: () => void
}) {
  const { folder, depth } = item
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
    data: { type: 'folder', item },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="group relative"
        style={{ paddingLeft: `${depth * INDENT_PX}px` }}
      >
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all border w-full text-left ${
              isNestTarget
                ? 'bg-primary/20 border-primary ring-2 ring-primary/30 shadow-sm scale-[1.02]'
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
            {isNestTarget && (
              <span className="text-[10px] text-primary font-medium ml-auto flex-shrink-0">↳ nidifica qui</span>
            )}
            {!isNestTarget && (
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
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// Drag overlay (ghost preview while dragging)
function DragOverlayFolder({ folder, nestMode }: { folder: Folder; nestMode: boolean }) {
  const totalCount = getTotalTaskCount(folder)
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border bg-card shadow-lg w-fit max-w-xs ${
      nestMode ? 'border-primary' : 'border-primary/50'
    }`}>
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
  const [currentOverId, setCurrentOverId] = useState<string | null>(null)
  const [nestTargetId, setNestTargetId] = useState<string | null>(null)
  const { confirm, confirmProps } = useConfirm()
  const savingRef = useRef(false)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverOverIdRef = useRef<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  // Flat map of all folders by id
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

  // Flattened list for sortable context (includes expanded children)
  const flatItems = useMemo(() => flattenTree(folders, expandedIds), [folders, expandedIds])
  const sortableIds = useMemo(() => flatItems.map((i) => i.id), [flatItems])

  // Clear hover timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    }
  }, [])

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

  function clearHoverTimer() {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    hoverOverIdRef.current = null
  }

  // ---- Drag handlers ----
  function handleDragStart(event: DragStartEvent) {
    setDragActiveId(event.active.id as string)
    setNestTargetId(null)
    clearHoverTimer()
  }

  function handleDragOver(event: DragOverEvent) {
    const overId = event.over?.id as string | null
    setCurrentOverId(overId)

    if (!overId || !dragActiveId || overId === dragActiveId) {
      clearHoverTimer()
      setNestTargetId(null)
      return
    }

    // Check if the over item is a root folder (can accept nesting)
    const overItem = flatItems.find((i) => i.id === overId)
    const dragItem = flatItems.find((i) => i.id === dragActiveId)

    if (!overItem || !dragItem) {
      clearHoverTimer()
      setNestTargetId(null)
      return
    }

    // Can only nest into root-level folders, and can't nest a folder that has children
    const canNest = overItem.depth === 0
      && (dragItem.folder.children ?? []).length === 0
      && overItem.id !== dragActiveId

    if (!canNest) {
      clearHoverTimer()
      if (nestTargetId === overId) setNestTargetId(null)
      return
    }

    // If hovering over a new folder, start the timer
    if (hoverOverIdRef.current !== overId) {
      clearHoverTimer()
      hoverOverIdRef.current = overId
      hoverTimerRef.current = setTimeout(() => {
        setNestTargetId(overId)
      }, NEST_HOVER_MS)
    }
  }

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    const activeNestTarget = nestTargetId

    setDragActiveId(null)
    setCurrentOverId(null)
    setNestTargetId(null)
    clearHoverTimer()

    if (!over) return

    const draggedId = active.id as string
    const targetId = over.id as string

    const draggedFolder = folderMap.get(draggedId)
    if (!draggedFolder) return

    // ===== NEST MODE: hover timer triggered =====
    if (activeNestTarget && activeNestTarget !== draggedId) {
      const targetFolder = folderMap.get(activeNestTarget)
      if (!targetFolder) return

      // Can't nest into a sub-folder (max 2 levels)
      if (targetFolder.parentId) return
      // Can't nest a folder that has children
      if ((draggedFolder.children ?? []).length > 0) return

      // Build updated tree: remove from current position, add as child of target
      const newFolders = folders
        .filter((f) => f.id !== draggedId)
        .map((f) => {
          // Remove from any parent's children
          const cleanChildren = (f.children ?? []).filter((c) => c.id !== draggedId)
          if (f.id === activeNestTarget) {
            return {
              ...f,
              children: [...cleanChildren, { ...draggedFolder, parentId: activeNestTarget, children: [] }],
            }
          }
          return { ...f, children: cleanChildren }
        })

      saveBatchOrder(newFolders)
      setExpandedIds((prev) => new Set(prev).add(activeNestTarget))
      return
    }

    // ===== REORDER MODE: simple drag up/down =====
    if (draggedId === targetId) return

    const dragIdx = flatItems.findIndex((i) => i.id === draggedId)
    const targetIdx = flatItems.findIndex((i) => i.id === targetId)
    if (dragIdx === -1 || targetIdx === -1) return

    const dragItem = flatItems[dragIdx]
    const targetItem = flatItems[targetIdx]

    // Both at root level — reorder roots
    if (dragItem.depth === 0 && targetItem.depth === 0) {
      const rootIds = folders.map((f) => f.id)
      const oldIdx = rootIds.indexOf(draggedId)
      const newIdx = rootIds.indexOf(targetId)
      if (oldIdx === -1 || newIdx === -1) return
      const reordered = [...folders]
      const [moved] = reordered.splice(oldIdx, 1)
      reordered.splice(newIdx, 0, moved)
      saveBatchOrder(reordered)
      return
    }

    // Both children of same parent — reorder within parent
    if (dragItem.parentId && dragItem.parentId === targetItem.parentId) {
      const parent = folders.find((f) => f.id === dragItem.parentId)
      if (!parent?.children) return
      const kids = [...parent.children]
      const oldIdx = kids.findIndex((c) => c.id === draggedId)
      const newIdx = kids.findIndex((c) => c.id === targetId)
      if (oldIdx === -1 || newIdx === -1) return
      const [moved] = kids.splice(oldIdx, 1)
      kids.splice(newIdx, 0, moved)
      const newFolders = folders.map((f) => f.id === parent.id ? { ...f, children: kids } : f)
      saveBatchOrder(newFolders)
      return
    }

    // Child dragged to root position (un-nest)
    if (dragItem.depth > 0 && targetItem.depth === 0) {
      const newIdx = folders.findIndex((f) => f.id === targetId)
      if (newIdx === -1) return
      const newFolders = folders.map((f) => ({
        ...f,
        children: (f.children ?? []).filter((c) => c.id !== draggedId),
      }))
      const unparented = { ...draggedFolder, parentId: null, children: [] as Folder[] }
      newFolders.splice(newIdx + 1, 0, unparented)
      saveBatchOrder(newFolders)
      return
    }
  }, [flatItems, folderMap, folders, nestTargetId, projectId, onFoldersChange])

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
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
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

          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            {flatItems.map((item) => {
              const isExpanded = expandedIds.has(item.id)
              const isNestTarget = nestTargetId === item.id && dragActiveId !== item.id

              return (
                <div key={item.id}>
                  <SortableFolderRow
                    item={item}
                    isExpanded={isExpanded}
                    selectedFolderId={selectedFolderId}
                    editingId={editingId}
                    editName={editName}
                    editColor={editColor}
                    submitting={submitting}
                    isNestTarget={isNestTarget}
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
                  {creating && creatingParentId === item.id && (
                    <div className="mt-1" style={{ paddingLeft: `${INDENT_PX}px` }}>
                      {renderCreateForm()}
                    </div>
                  )}
                </div>
              )
            })}
          </SortableContext>
        </div>

        <DragOverlay dropAnimation={null}>
          {draggedFolder && <DragOverlayFolder folder={draggedFolder} nestMode={!!nestTargetId} />}
        </DragOverlay>
      </DndContext>

      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
