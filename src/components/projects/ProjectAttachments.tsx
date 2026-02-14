'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Trash2, Download, FileText, Image, File, Eye, Pencil, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'

interface Attachment {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  createdAt: string
  uploadedBy: { id: string; firstName: string; lastName: string }
}

interface ProjectAttachmentsProps {
  projectId: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText
  return File
}

function isPreviewable(mimeType: string): boolean {
  return (
    mimeType.startsWith('image/') ||
    mimeType === 'application/pdf' ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/')
  )
}

function getGDrivePreviewUrl(fileUrl: string): string {
  const match = fileUrl.match(/\/d\/([^/]+)/)
  if (match) {
    return `https://drive.google.com/file/d/${match[1]}/preview`
  }
  return fileUrl
}

export function ProjectAttachments({ projectId }: ProjectAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadFileName, setUploadFileName] = useState('')
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)

  const fetchAttachments = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/attachments`)
    if (res.ok) {
      const data = await res.json()
      setAttachments(data.items || [])
    }
  }, [projectId])

  useEffect(() => {
    fetchAttachments()
  }, [fetchAttachments])

  function uploadFileWithProgress(file: globalThis.File): Promise<void> {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)

      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener('progress', (evt) => {
        if (evt.lengthComputable) {
          setUploadProgress(Math.round((evt.loaded / evt.total) * 100))
        }
      })
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      })
      xhr.addEventListener('error', () => reject(new Error('Upload failed')))
      xhr.open('POST', `/api/projects/${projectId}/attachments`)
      xhr.send(formData)
    })
  }

  const onDrop = useCallback(async (acceptedFiles: globalThis.File[]) => {
    if (acceptedFiles.length === 0) return
    setUploading(true)
    try {
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i]
        setUploadFileName(file.name)
        setUploadProgress(0)
        await uploadFileWithProgress(file)
      }
      fetchAttachments()
    } finally {
      setUploading(false)
      setUploadProgress(0)
      setUploadFileName('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, fetchAttachments])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
  })

  async function handleDelete(attachmentId: string) {
    if (!confirm('Eliminare questo file?')) return
    const res = await fetch(`/api/projects/${projectId}/attachments?attachmentId=${attachmentId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
    }
  }

  function startRename(att: Attachment) {
    setRenamingId(att.id)
    setRenameValue(att.fileName)
  }

  async function handleRename(attachmentId: string) {
    if (!renameValue.trim()) return
    setRenaming(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/attachments?attachmentId=${attachmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: renameValue.trim() }),
      })
      if (res.ok) {
        const updated = await res.json()
        setAttachments((prev) => prev.map((a) => a.id === attachmentId ? { ...a, fileName: updated.fileName } : a))
        setRenamingId(null)
      }
    } finally {
      setRenaming(false)
    }
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-4 ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted" />
        {uploading ? (
          <div className="space-y-2">
            <p className="text-sm text-primary font-medium">
              Caricamento: {uploadFileName} ({uploadProgress}%)
            </p>
            <div className="w-full max-w-xs mx-auto h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : isDragActive ? (
          <p className="text-sm text-primary">Rilascia i file qui...</p>
        ) : (
          <p className="text-sm text-muted">Trascina i file qui o clicca per selezionare</p>
        )}
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-muted text-center py-4">Nessun file allegato.</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => {
            const Icon = getFileIcon(att.mimeType)
            const canPreview = isPreviewable(att.mimeType) || att.fileUrl.includes('drive.google.com')
            const isRenaming = renamingId === att.id
            return (
              <div
                key={att.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
              >
                {att.mimeType.startsWith('image/') ? (
                  <button
                    onClick={() => setPreviewAttachment(att)}
                    className="flex-shrink-0 w-10 h-10 rounded overflow-hidden bg-secondary/50 hover:opacity-80 transition-opacity"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={att.fileUrl}
                      alt={att.fileName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ) : (
                  <Icon className="h-5 w-5 text-muted flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  {isRenaming ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(att.id)
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                      />
                      <button
                        onClick={() => handleRename(att.id)}
                        disabled={renaming}
                        className="p-1 rounded hover:bg-primary/10 text-primary transition-colors"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setRenamingId(null)}
                        className="p-1 rounded hover:bg-secondary transition-colors"
                      >
                        <X className="h-4 w-4 text-muted" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium truncate">{att.fileName}</p>
                      <p className="text-xs text-muted">
                        {formatFileSize(att.fileSize)} - {att.uploadedBy.firstName} {att.uploadedBy.lastName} - {new Date(att.createdAt).toLocaleDateString('it-IT')}
                      </p>
                    </>
                  )}
                </div>

                {!isRenaming && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canPreview && (
                      <button
                        onClick={() => setPreviewAttachment(att)}
                        className="p-1.5 rounded hover:bg-primary/10 transition-colors"
                        title="Anteprima"
                      >
                        <Eye className="h-4 w-4 text-muted" />
                      </button>
                    )}
                    <button
                      onClick={() => startRename(att)}
                      className="p-1.5 rounded hover:bg-primary/10 transition-colors"
                      title="Rinomina"
                    >
                      <Pencil className="h-4 w-4 text-muted" />
                    </button>
                    <a
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-primary/10 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                      title="Scarica"
                    >
                      <Download className="h-4 w-4 text-muted" />
                    </a>
                    <button
                      onClick={() => handleDelete(att.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                      title="Elimina"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        open={!!previewAttachment}
        onClose={() => setPreviewAttachment(null)}
        title={previewAttachment?.fileName || 'Anteprima'}
        size="lg"
      >
        {previewAttachment && (
          <div className="max-h-[70vh] overflow-auto">
            {previewAttachment.mimeType.startsWith('image/') ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewAttachment.fileUrl}
                alt={previewAttachment.fileName}
                className="max-w-full h-auto rounded-lg mx-auto"
                referrerPolicy="no-referrer"
              />
            ) : previewAttachment.mimeType === 'application/pdf' || previewAttachment.fileUrl.includes('drive.google.com') ? (
              <iframe
                src={getGDrivePreviewUrl(previewAttachment.fileUrl)}
                className="w-full h-[65vh] rounded-lg border-0"
                allow="autoplay"
                title={previewAttachment.fileName}
              />
            ) : previewAttachment.mimeType.startsWith('video/') ? (
              <video
                src={previewAttachment.fileUrl}
                controls
                className="max-w-full h-auto rounded-lg mx-auto"
              />
            ) : previewAttachment.mimeType.startsWith('audio/') ? (
              <audio
                src={previewAttachment.fileUrl}
                controls
                className="w-full mt-4"
              />
            ) : (
              <div className="text-center py-8">
                <File className="h-12 w-12 mx-auto mb-3 text-muted" />
                <p className="text-sm text-muted">Anteprima non disponibile per questo tipo di file.</p>
                <a
                  href={previewAttachment.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline mt-2 inline-block"
                >
                  Apri in una nuova scheda
                </a>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between text-xs text-muted">
              <span>{formatFileSize(previewAttachment.fileSize)} - {previewAttachment.mimeType}</span>
              <a
                href={previewAttachment.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Apri in Drive
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
