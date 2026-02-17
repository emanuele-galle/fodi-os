'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Film, Plus, Search, Image, FileText, FileVideo, FileAudio, File,
  FolderOpen, ArrowLeft, ExternalLink, Upload, FolderPlus, Link2Off, Star,
  HardDrive, AlertCircle, LayoutGrid, List, Cloud, CloudOff,
} from 'lucide-react'
import NextImage from 'next/image'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Textarea } from '@/components/ui/Textarea'
import { FileUpload } from '@/components/shared/FileUpload'

// ============================================================
// Types
// ============================================================

interface Asset {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  category: string
  tags: string[]
  description: string | null
  uploadedBy: { firstName: string; lastName: string } | null
  project: { id: string; name: string } | null
  driveFileId: string | null
  projectId: string | null
  createdAt: string
}

interface ProjectOption {
  id: string
  name: string
}

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size: number
  createdTime: string
  modifiedTime: string
  webViewLink: string
  webContentLink: string | null
  iconLink: string | null
  thumbnailLink: string | null
  isFolder: boolean
  starred: boolean
}

// ============================================================
// Helpers
// ============================================================

const CATEGORY_OPTIONS = [
  { value: '', label: 'Tutte le categorie' },
  { value: 'image', label: 'Immagini' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'document', label: 'Documenti' },
  { value: 'other', label: 'Altro' },
]

const CATEGORY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  image: 'success',
  video: 'warning',
  audio: 'default',
  document: 'outline',
  other: 'default',
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.startsWith('video/')) return FileVideo
  if (mimeType.startsWith('audio/')) return FileAudio
  if (mimeType.includes('folder')) return FolderOpen
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text') || mimeType.includes('spreadsheet') || mimeType.includes('presentation')) return FileText
  return File
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

// ============================================================
// MinIO Assets Tab
// ============================================================

function MinioAssetsTab() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null)
  // Pagination
  const [page, setPage] = useState(1)
  const [totalAssets, setTotalAssets] = useState(0)
  const PAGE_LIMIT = 18
  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  // Detail modal editing
  const [editing, setEditing] = useState(false)
  const [editTags, setEditTags] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDescription, setEditDescription] = useState('')
  // Drag & drop
  const [isDragging, setIsDragging] = useState(false)

  // Fetch projects for filter dropdown
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects?limit=100')
        if (res.ok) {
          const data = await res.json()
          const items = data.items || data.projects || data || []
          setProjects(Array.isArray(items) ? items.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })) : [])
        }
      } catch { /* ignore */ }
    }
    loadProjects()
  }, [])

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter) params.set('category', categoryFilter)
      if (projectFilter) params.set('projectId', projectFilter)
      params.set('page', String(page))
      params.set('limit', String(PAGE_LIMIT))
      const res = await fetch(`/api/assets?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAssets(data.items || [])
        setTotalAssets(data.total || 0)
      } else {
        setFetchError('Errore nel caricamento degli asset')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento degli asset')
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter, projectFilter, page])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [search, categoryFilter, projectFilter])

  // Populate edit fields when detail modal opens
  useEffect(() => {
    if (detailAsset) {
      setEditTags(detailAsset.tags?.join(', ') || '')
      setEditCategory(detailAsset.category || '')
      setEditDescription(detailAsset.description || '')
      setEditing(false)
    }
  }, [detailAsset])

  // Detail modal actions
  const handleSaveDetail = async () => {
    if (!detailAsset) return
    try {
      const res = await fetch(`/api/assets/${detailAsset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
          category: editCategory,
          description: editDescription || null,
        }),
      })
      if (res.ok) {
        setEditing(false)
        setDetailAsset(null)
        fetchAssets()
      }
    } catch { /* ignore */ }
  }

  const handleDeleteDetail = async () => {
    if (!detailAsset) return
    if (!window.confirm(`Eliminare "${detailAsset.fileName}"?`)) return
    try {
      const res = await fetch(`/api/assets/${detailAsset.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDetailAsset(null)
        fetchAssets()
      }
    } catch { /* ignore */ }
  }

  const handleStartReview = async () => {
    if (!detailAsset) return
    try {
      const res = await fetch(`/api/assets/${detailAsset.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        alert('Review creata!')
      }
    } catch { /* ignore */ }
  }

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.currentTarget === e.target) setIsDragging(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setModalOpen(true)
  }

  // Pagination helpers
  const totalPages = Math.max(1, Math.ceil(totalAssets / PAGE_LIMIT))
  const rangeStart = totalAssets === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1
  const rangeEnd = Math.min(page * PAGE_LIMIT, totalAssets)

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative"
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg pointer-events-none">
          <div className="text-center">
            <Upload className="h-12 w-12 text-primary mx-auto mb-2" />
            <p className="text-lg font-medium text-primary">Rilascia per caricare</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca asset..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          options={CATEGORY_OPTIONS}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-48"
        />
        <Select
          options={[
            { value: '', label: 'Tutti i progetti' },
            ...projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="w-full sm:w-48"
        />
        {/* View mode toggle */}
        <div className="hidden sm:flex items-center border border-border rounded-md overflow-hidden flex-shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
            title="Vista griglia"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
            title="Vista lista"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <div className="hidden sm:block flex-shrink-0">
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Upload className="h-4 w-4" />
            Carica Asset
          </Button>
        </div>
        <Button onClick={() => setModalOpen(true)} className="sm:hidden flex-shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Carica
        </Button>
      </div>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchAssets()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          icon={Film}
          title="Nessun asset trovato"
          description={search || categoryFilter ? 'Prova a modificare i filtri.' : 'Carica il tuo primo asset per iniziare.'}
          action={
            !search && !categoryFilter ? (
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Carica Asset
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset) => {
            const IconComponent = getFileIcon(asset.mimeType)
            const isImage = asset.mimeType.startsWith('image/')

            return (
              <Card
                key={asset.id}
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                onClick={() => setDetailAsset(asset)}
              >
                <div className="h-32 bg-secondary/50 flex items-center justify-center overflow-hidden relative">
                  {isImage ? (
                    <NextImage src={asset.fileUrl} alt={asset.fileName} fill className="object-cover" unoptimized />
                  ) : (
                    <IconComponent className="h-12 w-12 text-muted" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm truncate flex-1 mr-2">{asset.fileName}</p>
                    <div className="flex items-center gap-1.5">
                      {asset.driveFileId ? (
                        <span title="Sincronizzato su Google Drive"><Cloud className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" /></span>
                      ) : (
                        <span title="Solo MinIO"><CloudOff className="h-3.5 w-3.5 text-muted/40 flex-shrink-0" /></span>
                      )}
                      <Badge variant={CATEGORY_BADGE[asset.category] || 'default'}>{asset.category}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted mt-2">
                    <span>{formatFileSize(asset.fileSize)}</span>
                    <span className="truncate ml-2">
                      {asset.project?.name || (asset.uploadedBy ? `${asset.uploadedBy.firstName} ${asset.uploadedBy.lastName}` : '—')}
                    </span>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        /* List view */
        <div className="border border-border rounded-lg divide-y divide-border">
          {assets.map((asset) => {
            const IconComponent = getFileIcon(asset.mimeType)
            const isImage = asset.mimeType.startsWith('image/')

            return (
              <div
                key={asset.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => setDetailAsset(asset)}
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center overflow-hidden rounded relative">
                  {isImage ? (
                    <NextImage src={asset.fileUrl} alt={asset.fileName} fill className="object-cover rounded" unoptimized />
                  ) : (
                    <IconComponent className="h-5 w-5 text-muted" />
                  )}
                </div>
                <p className="flex-1 text-sm font-medium truncate min-w-0">{asset.fileName}</p>
                {asset.driveFileId ? (
                  <span title="Google Drive"><Cloud className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" /></span>
                ) : (
                  <span title="Solo MinIO"><CloudOff className="h-3.5 w-3.5 text-muted/40 flex-shrink-0" /></span>
                )}
                <Badge variant={CATEGORY_BADGE[asset.category] || 'default'} className="flex-shrink-0">{asset.category}</Badge>
                <span className="text-xs text-muted w-20 text-right flex-shrink-0 hidden md:block">{formatFileSize(asset.fileSize)}</span>
                <span className="text-xs text-muted w-24 text-right flex-shrink-0 hidden lg:block">{new Date(asset.createdAt).toLocaleDateString('it-IT')}</span>
                <span className="text-xs text-muted w-28 text-right flex-shrink-0 hidden xl:block truncate">
                  {asset.project?.name || (asset.uploadedBy ? `${asset.uploadedBy.firstName} ${asset.uploadedBy.lastName}` : '—')}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalAssets > 0 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted">
            Mostra {rangeStart}-{rangeEnd} di {totalAssets}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Precedente
            </Button>
            <span className="text-sm text-muted">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Successivo
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!detailAsset} onClose={() => { setDetailAsset(null); setEditing(false) }} title={detailAsset?.fileName || 'Dettaglio Asset'} size="lg">
        {detailAsset && (
          <div className="space-y-4">
            {detailAsset.mimeType.startsWith('image/') && (
              <div className="relative w-full h-80 bg-secondary rounded-md">
                <NextImage src={detailAsset.fileUrl} alt={detailAsset.fileName} fill className="object-contain rounded-md" unoptimized />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted">Nome File</p><p className="font-medium">{detailAsset.fileName}</p></div>
              <div><p className="text-muted">Dimensione</p><p className="font-medium">{formatFileSize(detailAsset.fileSize)}</p></div>
              <div><p className="text-muted">Tipo MIME</p><p className="font-medium">{detailAsset.mimeType}</p></div>
              {!editing && (
                <div><p className="text-muted">Categoria</p><Badge variant={CATEGORY_BADGE[detailAsset.category] || 'default'}>{detailAsset.category}</Badge></div>
              )}
              {detailAsset.project && (
                <div><p className="text-muted">Progetto</p><p className="font-medium">{detailAsset.project.name}</p></div>
              )}
              <div>
                <p className="text-muted">Google Drive</p>
                <p className="font-medium flex items-center gap-1.5">
                  {detailAsset.driveFileId ? (
                    <><Cloud className="h-4 w-4 text-blue-500" /> Sincronizzato</>
                  ) : (
                    <><CloudOff className="h-4 w-4 text-muted/50" /> Non sincronizzato</>
                  )}
                </p>
              </div>
            </div>

            {editing ? (
              <div className="space-y-3 border-t border-border pt-4">
                <div>
                  <label className="text-sm text-muted mb-1 block">Tag (separati da virgola)</label>
                  <Input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted mb-1 block">Categoria</label>
                  <Select
                    options={CATEGORY_OPTIONS.filter(o => o.value !== '')}
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted mb-1 block">Descrizione</label>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Descrizione opzionale..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Annulla</Button>
                  <Button size="sm" onClick={handleSaveDetail}>Salva</Button>
                </div>
              </div>
            ) : (
              <>
                {detailAsset.tags && detailAsset.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-muted mb-1">Tag</p>
                    <div className="flex flex-wrap gap-1">
                      {detailAsset.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
                    </div>
                  </div>
                )}
                {detailAsset.description && (
                  <div>
                    <p className="text-sm text-muted mb-1">Descrizione</p>
                    <p className="text-sm">{detailAsset.description}</p>
                  </div>
                )}
              </>
            )}

            {/* Action buttons */}
            {!editing && (
              <div className="flex gap-2 border-t border-border pt-4">
                <Button size="sm" onClick={() => setEditing(true)}>Modifica</Button>
                <Button size="sm" variant="outline" onClick={handleStartReview}>Avvia Review</Button>
                <div className="flex-1" />
                <Button size="sm" variant="destructive" onClick={handleDeleteDetail}>Elimina</Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Upload Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Carica Asset" size="lg">
        <FileUpload onUpload={() => { fetchAssets(); setModalOpen(false) }} maxFiles={10} maxSize={10 * 1024 * 1024 * 1024} />
      </Modal>
    </div>
  )
}

// ============================================================
// Google Drive Tab
// ============================================================

function GoogleDriveTab() {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([])
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : ''

  // Step 1: Resolve the root folder ID on mount
  useEffect(() => {
    async function resolveRoot() {
      try {
        const res = await fetch('/api/drive/files?pageSize=1')
        const data = await res.json()
        if (data.connected === false) {
          setConnected(false)
          setLoading(false)
          return
        }
        setConnected(true)
        const rootId = data.rootFolderId || 'root'
        setFolderStack([{ id: rootId, name: 'FODI OS' }])
      } catch {
        setConnected(false)
        setLoading(false)
      }
    }
    resolveRoot()
  }, [])

  // Step 2: Fetch files whenever folder or search changes (only after root resolved)
  const fetchFiles = useCallback(async () => {
    if (!currentFolderId) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (!search) params.set('folderId', currentFolderId)
      if (search) params.set('search', search)

      const res = await fetch(`/api/drive/files?${params}`)
      const data = await res.json()
      if (data.connected === false) {
        setConnected(false)
        return
      }
      setConnected(true)
      setFiles(data.files || [])
    } catch {
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [currentFolderId, search])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  const openFolder = (file: DriveFile) => {
    setSearch('')
    setFolderStack([...folderStack, { id: file.id, name: file.name }])
  }

  const goBack = () => {
    if (folderStack.length > 1) {
      setFolderStack(folderStack.slice(0, -1))
    }
  }

  const goToFolder = (index: number) => {
    setFolderStack(folderStack.slice(0, index + 1))
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('folderId', currentFolderId)

    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', (evt) => {
      if (evt.lengthComputable) {
        setUploadProgress(Math.round((evt.loaded / evt.total) * 100))
      }
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) fetchFiles()
      setUploading(false)
      setUploadProgress(0)
    })
    xhr.addEventListener('error', () => {
      setUploading(false)
      setUploadProgress(0)
    })
    xhr.open('POST', '/api/drive/upload')
    xhr.send(formData)
    e.target.value = ''
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      const res = await fetch('/api/drive/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName, parentId: currentFolderId }),
      })
      if (res.ok) {
        setNewFolderName('')
        setShowNewFolder(false)
        fetchFiles()
      }
    } catch { /* ignore */ }
  }

  if (connected === false) {
    return (
      <EmptyState
        icon={Link2Off}
        title="Google Drive non connesso"
        description="Collega il tuo account Google per accedere ai file di Drive."
        action={
          <Button onClick={() => window.location.href = '/api/auth/google'}>
            Connetti Google Drive
          </Button>
        }
      />
    )
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca su Drive..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowNewFolder(true)}>
            <FolderPlus className="h-4 w-4 mr-1" />
            Cartella
          </Button>
          <Button size="sm" onClick={() => document.getElementById('drive-upload')?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-1" />
            {uploading ? `${uploadProgress}%` : 'Carica'}
          </Button>
          <input id="drive-upload" type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </div>
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div className="mb-4">
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted mt-1">Upload in corso... {uploadProgress}%</p>
        </div>
      )}

      {/* Breadcrumb */}
      {!search && (
        <div className="flex items-center gap-1 mb-4 text-sm overflow-x-auto">
          {folderStack.map((folder, i) => (
            <div key={folder.id} className="flex items-center gap-1 whitespace-nowrap">
              {i > 0 && <span className="text-muted">/</span>}
              <button
                onClick={() => goToFolder(i)}
                className={`hover:text-primary transition-colors ${
                  i === folderStack.length - 1 ? 'font-medium text-foreground' : 'text-muted'
                }`}
              >
                {folder.name}
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={search ? 'Nessun risultato' : 'Cartella vuota'}
          description={search ? 'Prova con termini diversi.' : 'Questa cartella non contiene file.'}
        />
      ) : (
        <div className="border border-border rounded-lg divide-y divide-border">
          {folderStack.length > 1 && !search && (
            <button
              onClick={goBack}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-muted" />
              <span className="text-sm text-muted">Indietro</span>
            </button>
          )}
          {files.map((file) => {
            const IconComponent = getFileIcon(file.mimeType)
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors cursor-pointer group"
                onClick={() => {
                  if (file.isFolder) openFolder(file)
                  else if (file.webViewLink) window.open(file.webViewLink, '_blank')
                }}
              >
                {file.thumbnailLink && !file.isFolder ? (
                  <NextImage src={file.thumbnailLink} alt="" width={32} height={32} className="rounded object-cover" unoptimized />
                ) : (
                  <IconComponent className={`h-5 w-5 flex-shrink-0 ${file.isFolder ? 'text-amber-500' : 'text-muted'}`} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted">
                    {!file.isFolder && formatFileSize(file.size)}
                    {file.modifiedTime && ` · ${new Date(file.modifiedTime).toLocaleDateString('it-IT')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {file.starred && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                  {file.webViewLink && !file.isFolder && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted hover:text-primary"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Folder Modal */}
      <Modal open={showNewFolder} onClose={() => setShowNewFolder(false)} title="Nuova Cartella">
        <div className="space-y-4">
          <Input
            id="folderName"
            label="Nome cartella"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNewFolder(false)}>Annulla</Button>
            <Button onClick={handleCreateFolder}>Crea</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// ============================================================
// Main Page
// ============================================================

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<'minio' | 'drive'>('minio')

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Archivio Media</h1>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-border mb-6 overflow-x-auto scrollbar-none" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'minio'}
          onClick={() => setActiveTab('minio')}
          className={`px-4 py-2 min-h-[44px] text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 whitespace-nowrap touch-manipulation ${
            activeTab === 'minio'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <Film className="h-4 w-4" />
          Asset Interni
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'drive'}
          onClick={() => setActiveTab('drive')}
          className={`px-4 py-2 min-h-[44px] text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 whitespace-nowrap touch-manipulation ${
            activeTab === 'drive'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <HardDrive className="h-4 w-4" />
          Google Drive
        </button>
      </div>

      {activeTab === 'minio' ? <MinioAssetsTab /> : <GoogleDriveTab />}
    </div>
  )
}
