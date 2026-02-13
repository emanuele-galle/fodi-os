'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Film, Plus, Search, Image, FileText, FileVideo, FileAudio, File,
  FolderOpen, ArrowLeft, ExternalLink, Upload, FolderPlus, Link2Off, Star,
  HardDrive,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
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
  createdAt: string
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
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null)

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter) params.set('category', categoryFilter)
      const res = await fetch(`/api/assets?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAssets(data.items || [])
      }
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  return (
    <>
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
      ) : (
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
                <div className="h-32 bg-secondary/50 flex items-center justify-center overflow-hidden">
                  {isImage ? (
                    <img src={asset.fileUrl} alt={asset.fileName} className="w-full h-full object-cover" />
                  ) : (
                    <IconComponent className="h-12 w-12 text-muted" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm truncate flex-1 mr-2">{asset.fileName}</p>
                    <Badge variant={CATEGORY_BADGE[asset.category] || 'default'}>{asset.category}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted mt-2">
                    <span>{formatFileSize(asset.fileSize)}</span>
                    <span>
                      {asset.uploadedBy ? `${asset.uploadedBy.firstName} ${asset.uploadedBy.lastName}` : '—'}
                    </span>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!detailAsset} onClose={() => setDetailAsset(null)} title={detailAsset?.fileName || 'Dettaglio Asset'} size="lg">
        {detailAsset && (
          <div className="space-y-4">
            {detailAsset.mimeType.startsWith('image/') && (
              <img src={detailAsset.fileUrl} alt={detailAsset.fileName} className="w-full max-h-80 object-contain rounded-md bg-secondary" />
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted">Nome File</p><p className="font-medium">{detailAsset.fileName}</p></div>
              <div><p className="text-muted">Categoria</p><Badge variant={CATEGORY_BADGE[detailAsset.category] || 'default'}>{detailAsset.category}</Badge></div>
              <div><p className="text-muted">Dimensione</p><p className="font-medium">{formatFileSize(detailAsset.fileSize)}</p></div>
              <div><p className="text-muted">Tipo MIME</p><p className="font-medium">{detailAsset.mimeType}</p></div>
            </div>
            {detailAsset.tags && detailAsset.tags.length > 0 && (
              <div>
                <p className="text-sm text-muted mb-1">Tag</p>
                <div className="flex flex-wrap gap-1">
                  {detailAsset.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Upload Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Carica Asset" size="lg">
        <FileUpload onUpload={() => { fetchAssets(); setModalOpen(false) }} maxFiles={10} maxSize={500 * 1024 * 1024} />
      </Modal>
    </>
  )
}

// ============================================================
// Google Drive Tab
// ============================================================

function GoogleDriveTab() {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'Il mio Drive' },
  ])
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const currentFolderId = folderStack[folderStack.length - 1].id

  const fetchFiles = useCallback(async () => {
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
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folderId', currentFolderId)
      const res = await fetch('/api/drive/upload', { method: 'POST', body: formData })
      if (res.ok) fetchFiles()
    } finally {
      setUploading(false)
      e.target.value = ''
    }
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
          <Button size="sm" onClick={() => document.getElementById('drive-upload')?.click()}>
            <Upload className="h-4 w-4 mr-1" />
            {uploading ? 'Upload...' : 'Carica'}
          </Button>
          <input id="drive-upload" type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </div>
      </div>

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
                  <img src={file.thumbnailLink} alt="" className="h-8 w-8 rounded object-cover" />
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
        <h1 className="text-xl md:text-2xl font-bold">Asset Library</h1>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setActiveTab('minio')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
            activeTab === 'minio'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <Film className="h-4 w-4" />
          Asset Interni
        </button>
        <button
          onClick={() => setActiveTab('drive')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
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
