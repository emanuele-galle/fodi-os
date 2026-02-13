'use client'

import { useState, useRef } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Camera, Trash2, Loader2 } from 'lucide-react'

interface AvatarUploadProps {
  name: string
  currentUrl?: string | null
  onUploaded: (avatarUrl: string | null) => void
}

export function AvatarUpload({ name, currentUrl, onUploaded }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const displayUrl = preview || currentUrl

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    if (!file.type.startsWith('image/')) {
      setError('Seleziona un file immagine')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Immagine troppo grande (max 5MB)')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)

    // Upload
    uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/users/me/avatar', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Errore upload')
      }

      const user = await res.json()
      setPreview(null)
      onUploaded(user.avatarUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore upload')
      setPreview(null)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    setError('')
    try {
      const res = await fetch('/api/users/me/avatar', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Errore rimozione')
      }
      setPreview(null)
      onUploaded(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore rimozione')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative group">
        <Avatar name={name} src={displayUrl} size="lg" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || removing}
          >
            {uploading ? 'Caricamento...' : 'Cambia foto'}
          </Button>
          {currentUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={uploading || removing}
              className="text-destructive hover:text-destructive"
            >
              {removing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <p className="text-xs text-muted">JPG, PNG, WebP o GIF. Max 5MB.</p>
      </div>
    </div>
  )
}
