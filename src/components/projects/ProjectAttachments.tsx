'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Paperclip, Upload, Trash2, Download, FileText, Image, File } from 'lucide-react'
import { Button } from '@/components/ui/Button'

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
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText
  return File
}

export function ProjectAttachments({ projectId }: ProjectAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)

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

  const onDrop = useCallback(async (acceptedFiles: globalThis.File[]) => {
    if (acceptedFiles.length === 0) return
    setUploading(true)
    try {
      for (const file of acceptedFiles) {
        const formData = new FormData()
        formData.append('file', file)
        await fetch(`/api/projects/${projectId}/attachments`, {
          method: 'POST',
          body: formData,
        })
      }
      fetchAttachments()
    } finally {
      setUploading(false)
    }
  }, [projectId, fetchAttachments])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 50 * 1024 * 1024,
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
          <p className="text-sm text-muted">Caricamento in corso...</p>
        ) : isDragActive ? (
          <p className="text-sm text-primary">Rilascia i file qui...</p>
        ) : (
          <p className="text-sm text-muted">Trascina i file qui o clicca per selezionare (max 50 MB)</p>
        )}
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-muted text-center py-4">Nessun file allegato.</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => {
            const Icon = getFileIcon(att.mimeType)
            return (
              <div
                key={att.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
              >
                <Icon className="h-5 w-5 text-muted flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{att.fileName}</p>
                  <p className="text-xs text-muted">
                    {formatFileSize(att.fileSize)} - {att.uploadedBy.firstName} {att.uploadedBy.lastName} - {new Date(att.createdAt).toLocaleDateString('it-IT')}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-primary/10 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="h-4 w-4 text-muted" />
                  </a>
                  <button
                    onClick={() => handleDelete(att.id)}
                    className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
