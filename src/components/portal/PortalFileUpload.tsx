'use client'

/* eslint-disable react-perf/jsx-no-new-function-as-prop -- component handlers and dynamic props */
import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, Loader2 } from 'lucide-react'

interface UploadedFile {
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
}

interface PortalFileUploadProps {
  onUpload: (file: UploadedFile) => void
  onRemove?: (index: number) => void
  files?: UploadedFile[]
  maxFiles?: number
  accept?: string
}

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PortalFileUpload({
  onUpload,
  onRemove,
  files = [],
  maxFiles = 5,
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt',
}: PortalFileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = useCallback(
    async (file: File) => {
      setError('')

      if (file.size > MAX_FILE_SIZE) {
        setError('File troppo grande (max 20MB)')
        return
      }

      if (files.length >= maxFiles) {
        setError(`Massimo ${maxFiles} file`)
        return
      }

      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/portal/upload', {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Errore upload')
          return
        }
        const data = await res.json()
        onUpload(data)
      } catch {
        setError('Errore di connessione')
      } finally {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [files.length, maxFiles, onUpload]
  )

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-secondary/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) upload(file)
          }}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Caricamento...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Upload className="h-5 w-5" />
            <span className="text-sm">Trascina un file o clicca per selezionare</span>
            <span className="text-[10px]">Max 20MB</span>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/50 text-sm"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate flex-1">{f.fileName}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatFileSize(f.fileSize)}
              </span>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="shrink-0 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
