import { useRef, useState } from 'react'
import { Paperclip, FileText, Image, Download, X, Link2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatFileSize, type Attachment } from './task-detail-types'
import { MAX_UPLOAD_SIZE_MB, MAX_UPLOAD_SIZE_BYTES } from '@/lib/upload-constants'

interface TaskAttachmentsProps {
  taskId: string
  projectId?: string | null
  attachments: Attachment[]
  onAttachmentsChange: () => void
}

export function TaskAttachments({ taskId, projectId, attachments, onAttachmentsChange }: TaskAttachmentsProps) {
  const [uploading, setUploading] = useState(false)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [addingLink, setAddingLink] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return
    // Client-side size check
    for (const file of Array.from(e.target.files)) {
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        alert(`Il file "${file.name}" supera il limite di ${MAX_UPLOAD_SIZE_MB} MB. Usa Link Esterno per file più grandi.`)
        e.target.value = ''
        return
      }
    }
    setUploading(true)
    try {
      for (const file of Array.from(e.target.files)) {
        const formData = new FormData()
        formData.append('file', file)
        if (projectId) {
          formData.append('projectId', projectId)
        }

        const assetRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!assetRes.ok) {
          console.error('Asset upload failed:', await assetRes.text())
          continue
        }

        const assetData = await assetRes.json()

        await fetch(`/api/tasks/${taskId}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileUrl: assetData.fileUrl,
            fileSize: file.size,
            mimeType: file.type || 'application/octet-stream',
          }),
        })
      }
      onAttachmentsChange()
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleAddLink() {
    if (!linkUrl.trim()) return
    setAddingLink(true)
    setLinkError(null)
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: linkUrl.trim(),
          fileUrl: linkUrl.trim(),
          fileSize: 0,
          mimeType: 'application/x-external-link',
          type: 'EXTERNAL',
        }),
      })
      if (res.ok) {
        setShowLinkForm(false)
        setLinkUrl('')
        onAttachmentsChange()
      } else {
        const data = await res.json().catch(() => ({}))
        setLinkError(data.error || 'Errore')
      }
    } finally {
      setAddingLink(false)
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    await fetch(`/api/tasks/${taskId}/attachments?attachmentId=${attachmentId}`, {
      method: 'DELETE',
    })
    onAttachmentsChange()
  }

  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium flex items-center gap-1.5">
          <Paperclip className="h-4 w-4" />
          Allegati
          {attachments.length > 0 && (
            <span className="text-xs text-muted">({attachments.length})</span>
          )}
        </h4>
        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Paperclip className="h-3.5 w-3.5 mr-1" />
            {uploading ? 'Caricamento...' : 'Allega file'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowLinkForm(!showLinkForm)}
          >
            <Link2 className="h-3.5 w-3.5 mr-1" />
            Link
          </Button>
        </div>
      </div>

      {showLinkForm && (
        <div className="mb-3 flex items-center gap-2">
          <Input
            placeholder="https://drive.google.com/..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="h-8 text-sm flex-1"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddLink(); if (e.key === 'Escape') setShowLinkForm(false) }}
          />
          <Button size="sm" onClick={handleAddLink} disabled={addingLink || !linkUrl.trim()}>
            {addingLink ? '...' : 'Aggiungi'}
          </Button>
          {linkError && <span className="text-xs text-destructive">{linkError}</span>}
        </div>
      )}

      {attachments.length > 0 ? (
        <div className="space-y-2 max-h-52 md:max-h-40 overflow-y-auto">
          {attachments.map((att) => {
            const isExternal = att.type === 'EXTERNAL'
            const isImage = !isExternal && att.mimeType.startsWith('image/')
            const IconComp = isExternal ? ExternalLink : isImage ? Image : FileText
            return (
              <div
                key={att.id}
                className="flex items-center gap-3 p-2 rounded-md border border-border bg-secondary/30 group"
              >
                <div className={`h-8 w-8 rounded bg-secondary flex items-center justify-center shrink-0`}>
                  <IconComp className={`h-4 w-4 ${isExternal ? 'text-primary' : 'text-muted'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{att.fileName}</p>
                  <p className="text-xs text-muted">
                    {isExternal
                      ? (att.linkProvider && att.linkProvider !== 'other' ? att.linkProvider.replace('_', ' ') : 'Link esterno')
                      : formatFileSize(att.fileSize)} &middot; {att.uploadedBy.firstName} {att.uploadedBy.lastName}
                  </p>
                </div>
                <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <a
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-secondary transition-colors"
                    title={isExternal ? 'Apri' : 'Scarica'}
                  >
                    {isExternal ? <ExternalLink className="h-3.5 w-3.5 text-primary" /> : <Download className="h-3.5 w-3.5 text-muted" />}
                  </a>
                  <button
                    onClick={() => handleDeleteAttachment(att.id)}
                    className="p-1 rounded hover:bg-destructive/10 transition-colors"
                    title="Rimuovi"
                  >
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted">Nessun allegato.</p>
      )}
    </div>
  )
}
