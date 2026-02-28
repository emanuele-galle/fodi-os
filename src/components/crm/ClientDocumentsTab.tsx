'use client'

import { useState, useEffect, useCallback } from 'react'
import { useConfirm } from '@/hooks/useConfirm'
import { FileText, Upload, ExternalLink, Trash2, AlertCircle, Paperclip, Link2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { MAX_UPLOAD_SIZE_MB, MAX_UPLOAD_SIZE_BYTES } from '@/lib/upload-constants'

interface ClientDocumentsTabProps {
  clientId: string
}

export function ClientDocumentsTab({ clientId }: ClientDocumentsTabProps) {
  const CATEGORY_LABELS: Record<string, string> = { contract: 'Contratto', quote: 'Preventivo', invoice: 'Fattura', general: 'Generale' }
  const [docs, setDocs] = useState<Array<{ id: string; name: string; fileUrl: string; fileSize: number | null; mimeType: string | null; type?: string; linkProvider?: string | null; category: string; createdAt: string }>>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkName, setLinkName] = useState('')
  const [addingLink, setAddingLink] = useState(false)
  const { confirm: confirmDocDelete, confirmProps: confirmDocDeleteProps } = useConfirm()

  const fetchDocs = useCallback(() => {
    fetch(`/api/clients/${clientId}/documents`)
      .then(r => r.json())
      .then(data => setDocs(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_UPLOAD_SIZE_BYTES) { setUploadError(`File troppo grande (max ${MAX_UPLOAD_SIZE_MB} MB). Usa Link Esterno per file più grandi.`); return }
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch(`/api/clients/${clientId}/documents`, { method: 'POST', body: fd })
      if (res.ok) { fetchDocs() } else { const data = await res.json().catch(() => ({})); setUploadError(data.error || 'Errore upload') }
    } catch { setUploadError('Errore di rete') }
    finally { setUploading(false); e.target.value = '' }
  }

  const handleAddLink = async () => {
    if (!linkUrl.trim()) return
    setAddingLink(true)
    setUploadError(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl.trim(), name: linkName.trim() || undefined }),
      })
      if (res.ok) {
        setShowLinkForm(false)
        setLinkUrl('')
        setLinkName('')
        fetchDocs()
      } else {
        const data = await res.json().catch(() => ({}))
        setUploadError(data.error || 'Errore')
      }
    } catch { setUploadError('Errore di rete') }
    finally { setAddingLink(false) }
  }

  const handleDelete = async (docId: string) => {
    const ok = await confirmDocDelete({ message: 'Eliminare questo documento?', variant: 'danger' })
    if (!ok) return
    await fetch(`/api/clients/${clientId}/documents/${docId}`, { method: 'DELETE' })
    fetchDocs()
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted">{docs.length} document{docs.length !== 1 ? 'i' : 'o'}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLinkForm(!showLinkForm)}
            className="inline-flex items-center gap-1.5 text-sm font-medium cursor-pointer rounded-lg border border-border/50 px-3 py-1.5 hover:bg-secondary/50 transition-colors"
          >
            <Link2 className="h-4 w-4" />
            Link Esterno
          </button>
          <label className={`inline-flex items-center gap-1.5 text-sm font-medium cursor-pointer rounded-lg border border-border/50 px-3 py-1.5 hover:bg-secondary/50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload className="h-4 w-4" />
            {uploading ? 'Caricamento...' : 'Carica File'}
            <input type="file" className="hidden" onChange={handleUpload} accept="*/*" />
          </label>
        </div>
      </div>
      {showLinkForm && (
        <div className="mb-3 space-y-2 border border-border rounded-lg p-3">
          <Input placeholder="https://drive.google.com/..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddLink(); if (e.key === 'Escape') setShowLinkForm(false) }} />
          <Input placeholder="Nome (opzionale)" value={linkName} onChange={(e) => setLinkName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddLink() }} />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddLink} disabled={addingLink || !linkUrl.trim()}>
              {addingLink ? 'Aggiunta...' : 'Aggiungi'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowLinkForm(false)}>Annulla</Button>
          </div>
        </div>
      )}
      {uploadError && (
        <div className="mb-3 flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{uploadError}
        </div>
      )}
      {docs.length === 0 ? (
        <EmptyState icon={Paperclip} title="Nessun documento" description="Carica contratti, preventivi e documenti relativi al cliente." />
      ) : (
        <div className="space-y-2">
          {docs.map(doc => {
            const isExternal = doc.type === 'EXTERNAL'
            return (
              <Card key={doc.id} className="!p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {isExternal ? <Link2 className="h-4 w-4 text-primary flex-shrink-0" /> : <FileText className="h-4 w-4 text-muted flex-shrink-0" />}
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate block">{doc.name}</span>
                      <span className="text-xs text-muted">
                        {CATEGORY_LABELS[doc.category] || doc.category} · {isExternal ? (doc.linkProvider && doc.linkProvider !== 'other' ? doc.linkProvider.replace('_', ' ') : 'Link esterno') : formatSize(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md hover:bg-secondary/50 text-muted hover:text-foreground transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button onClick={() => handleDelete(doc.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      <ConfirmDialog {...confirmDocDeleteProps} />
    </div>
  )
}
