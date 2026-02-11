'use client'

import { useState, useEffect, useCallback } from 'react'
import { Film, Plus, Search, Image, FileText, FileVideo, FileAudio, File } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileUpload } from '@/components/shared/FileUpload'

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
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText
  return File
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export default function AssetsPage() {
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

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Asset Library</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Carica Asset
        </Button>
      </div>

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
                {/* Thumbnail */}
                <div className="h-32 bg-secondary flex items-center justify-center overflow-hidden">
                  {isImage ? (
                    <img
                      src={asset.fileUrl}
                      alt={asset.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <IconComponent className="h-12 w-12 text-muted" />
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm truncate flex-1 mr-2">{asset.fileName}</p>
                    <Badge variant={CATEGORY_BADGE[asset.category] || 'default'}>
                      {asset.category}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted mt-2">
                    <span>{formatFileSize(asset.fileSize)}</span>
                    <span>
                      {asset.uploadedBy
                        ? `${asset.uploadedBy.firstName} ${asset.uploadedBy.lastName}`
                        : '—'}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {new Date(asset.createdAt).toLocaleDateString('it-IT')}
                  </p>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!detailAsset}
        onClose={() => setDetailAsset(null)}
        title={detailAsset?.fileName || 'Dettaglio Asset'}
        size="lg"
      >
        {detailAsset && (
          <div className="space-y-4">
            {detailAsset.mimeType.startsWith('image/') && (
              <img
                src={detailAsset.fileUrl}
                alt={detailAsset.fileName}
                className="w-full max-h-80 object-contain rounded-md bg-secondary"
              />
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted">Nome File</p>
                <p className="font-medium">{detailAsset.fileName}</p>
              </div>
              <div>
                <p className="text-muted">Categoria</p>
                <Badge variant={CATEGORY_BADGE[detailAsset.category] || 'default'}>
                  {detailAsset.category}
                </Badge>
              </div>
              <div>
                <p className="text-muted">Dimensione</p>
                <p className="font-medium">{formatFileSize(detailAsset.fileSize)}</p>
              </div>
              <div>
                <p className="text-muted">Tipo MIME</p>
                <p className="font-medium">{detailAsset.mimeType}</p>
              </div>
              <div>
                <p className="text-muted">Caricato da</p>
                <p className="font-medium">
                  {detailAsset.uploadedBy
                    ? `${detailAsset.uploadedBy.firstName} ${detailAsset.uploadedBy.lastName}`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted">Data</p>
                <p className="font-medium">
                  {new Date(detailAsset.createdAt).toLocaleDateString('it-IT')}
                </p>
              </div>
            </div>
            {detailAsset.tags && detailAsset.tags.length > 0 && (
              <div>
                <p className="text-sm text-muted mb-1">Tag</p>
                <div className="flex flex-wrap gap-1">
                  {detailAsset.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
            {detailAsset.description && (
              <div>
                <p className="text-sm text-muted mb-1">Descrizione</p>
                <p className="text-sm">{detailAsset.description}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Upload Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Carica Asset" size="lg">
        <FileUpload
          onUpload={() => {
            fetchAssets()
            setModalOpen(false)
          }}
          maxFiles={10}
          maxSize={50 * 1024 * 1024}
        />
      </Modal>
    </div>
  )
}
