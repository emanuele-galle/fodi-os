'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, Image, FileVideo, FileAudio, File, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

export interface UploadedFile {
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
}

interface FileUploadProps {
  onUpload: (files: UploadedFile[]) => void
  accept?: string
  maxFiles?: number
  maxSize?: number
  className?: string
}

interface FileEntry {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
  result?: UploadedFile
  previewUrl?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.startsWith('video/')) return FileVideo
  if (mimeType.startsWith('audio/')) return FileAudio
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText
  return File
}

export function FileUpload({
  onUpload,
  accept,
  maxFiles = 10,
  maxSize = 500 * 1024 * 1024,
  className,
}: FileUploadProps) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    const remaining = maxFiles - entries.length
    const toAdd = files.slice(0, remaining)

    const newEntries: FileEntry[] = toAdd.map((file) => {
      const entry: FileEntry = {
        file,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        progress: 0,
        status: 'pending',
      }

      if (file.size > maxSize) {
        entry.status = 'error'
        entry.error = `File troppo grande (max ${formatFileSize(maxSize)})`
      }

      if (file.type.startsWith('image/')) {
        entry.previewUrl = URL.createObjectURL(file)
      }

      return entry
    })

    setEntries((prev) => [...prev, ...newEntries])

    for (const entry of newEntries) {
      if (entry.status !== 'error') {
        uploadFile(entry)
      }
    }
  }, [entries.length, maxFiles, maxSize])

  async function uploadFile(entry: FileEntry) {
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, status: 'uploading' as const, progress: 10 } : e))
    )

    try {
      const formData = new FormData()
      formData.append('file', entry.file)

      const progressInterval = setInterval(() => {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id && e.status === 'uploading'
              ? { ...e, progress: Math.min(e.progress + 15, 85) }
              : e
          )
        )
      }, 200)

      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: entry.file.name,
          fileUrl: URL.createObjectURL(entry.file),
          fileSize: entry.file.size,
          mimeType: entry.file.type || 'application/octet-stream',
          category: getCategoryFromMime(entry.file.type),
        }),
      })

      clearInterval(progressInterval)

      if (res.ok) {
        const data = await res.json()
        const result: UploadedFile = {
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
        }

        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id ? { ...e, status: 'done' as const, progress: 100, result } : e
          )
        )

        setEntries((prev) => {
          const completed = prev
            .filter((e) => e.status === 'done' && e.result)
            .map((e) => e.result!)
          if (completed.length > 0) onUpload(completed)
          return prev
        })
      } else {
        const errData = await res.json().catch(() => null)
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id
              ? { ...e, status: 'error' as const, progress: 0, error: errData?.error || 'Errore durante il caricamento' }
              : e
          )
        )
      }
    } catch {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, status: 'error' as const, progress: 0, error: 'Errore di rete' }
            : e
        )
      )
    }
  }

  function getCategoryFromMime(mime: string): string {
    if (mime.startsWith('image/')) return 'image'
    if (mime.startsWith('video/')) return 'video'
    if (mime.startsWith('audio/')) return 'audio'
    if (mime.includes('pdf') || mime.includes('document') || mime.includes('text')) return 'document'
    return 'other'
  }

  function removeEntry(id: string) {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id)
      if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl)
      return prev.filter((e) => e.id !== id)
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone - glass style */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 min-h-[160px] touch-manipulation group',
          dragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border/50 hover:border-primary/40 bg-card/30 backdrop-blur-sm hover:bg-card/50'
        )}
      >
        <div className={cn(
          'flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300',
          dragging
            ? 'bg-primary/15 text-primary scale-110'
            : 'bg-secondary/60 text-muted group-hover:bg-primary/10 group-hover:text-primary'
        )}>
          <Upload className="h-6 w-6" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">
            {dragging ? 'Rilascia i file qui' : 'Trascina i file o clicca per selezionare'}
          </p>
          <p className="text-xs text-muted/60 mt-1">
            Max {maxFiles} file, {formatFileSize(maxSize)} ciascuno
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={accept}
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ''
          }}
          className="hidden"
        />
      </div>

      {/* File list - glass cards */}
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry) => {
            const Icon = getFileIcon(entry.file.type)
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm"
              >
                {/* Thumbnail or icon */}
                <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center overflow-hidden shrink-0">
                  {entry.previewUrl ? (
                    <img src={entry.previewUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-5 w-5 text-muted/60" />
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.file.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted/60">
                    <span>{formatFileSize(entry.file.size)}</span>
                    {entry.status === 'error' && (
                      <span className="text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {entry.error}
                      </span>
                    )}
                    {entry.status === 'done' && (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Caricato
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {entry.status === 'uploading' && (
                    <div className="mt-1.5 h-1 w-full bg-secondary/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${entry.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Remove button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8 rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeEntry(entry.id)
                  }}
                >
                  <X className="h-4 w-4 text-muted/60" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
