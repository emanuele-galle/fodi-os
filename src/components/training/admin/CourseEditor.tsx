'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save, Loader2, Upload, X, Image as ImageIcon } from 'lucide-react'

type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
type ProtectionLevel = 'NONE' | 'WATERMARK' | 'WATERMARK_DETECT'
type Role = 'ADMIN' | 'MANAGER' | 'SALES' | 'PM' | 'DEVELOPER' | 'CONTENT' | 'SUPPORT' | 'CLIENT'

interface Category {
  id: string
  name: string
  type: string
}

interface CourseForm {
  title: string
  slug: string
  categoryId: string
  description: string
  difficulty: Difficulty
  protectionLevel: ProtectionLevel
  allowedRoles: Role[]
  estimatedMins: string
  coverUrl: string
  isPublished: boolean
}

const EMPTY_FORM: CourseForm = {
  title: '',
  slug: '',
  categoryId: '',
  description: '',
  difficulty: 'BEGINNER',
  protectionLevel: 'NONE',
  allowedRoles: [],
  estimatedMins: '',
  coverUrl: '',
  isPublished: false,
}

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'BEGINNER', label: 'Principiante' },
  { value: 'INTERMEDIATE', label: 'Intermedio' },
  { value: 'ADVANCED', label: 'Avanzato' },
]

const PROTECTION_OPTIONS: { value: ProtectionLevel; label: string }[] = [
  { value: 'NONE', label: 'Nessuna' },
  { value: 'WATERMARK', label: 'Watermark' },
  { value: 'WATERMARK_DETECT', label: 'Watermark + Rilevamento' },
]

const ALL_ROLES: { value: Role; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SALES', label: 'Sales' },
  { value: 'PM', label: 'PM' },
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'CONTENT', label: 'Content' },
  { value: 'SUPPORT', label: 'Support' },
  { value: 'CLIENT', label: 'Client' },
]

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

interface CourseEditorProps {
  courseId?: string
  onSaved?: () => void
}

export function CourseEditor({ courseId, onSaved }: CourseEditorProps) {
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(!!courseId)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const isEditing = !!courseId

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/training/categories', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setCategories(json.data ?? [])
      }
    } catch {
      // silently fail
    }
  }, [])

  const fetchCourse = useCallback(async () => {
    if (!courseId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/training/courses/${courseId}`, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        const c = json.data
        setForm({
          title: c.title,
          slug: c.slug,
          categoryId: c.categoryId,
          description: c.description ?? '',
          difficulty: c.difficulty,
          protectionLevel: c.protectionLevel,
          allowedRoles: c.allowedRoles ?? [],
          estimatedMins: c.estimatedMins?.toString() ?? '',
          coverUrl: c.coverUrl ?? '',
          isPublished: c.isPublished,
        })
      }
    } catch {
      setError('Impossibile caricare il corso')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    fetchCategories()
    fetchCourse()
  }, [fetchCategories, fetchCourse])

  function handleTitleChange(title: string) {
    setForm((p) => ({
      ...p,
      title,
      slug: isEditing ? p.slug : slugify(title),
    }))
  }

  function toggleRole(role: Role) {
    setForm((p) => ({
      ...p,
      allowedRoles: p.allowedRoles.includes(role)
        ? p.allowedRoles.filter((r) => r !== role)
        : [...p.allowedRoles, role],
    }))
  }

  async function handleCoverUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('courseSlug', form.slug || 'temp')
      const res = await fetch('/api/training/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      if (res.ok) {
        const json = await res.json()
        setForm((p) => ({ ...p, coverUrl: json.data.url }))
      }
    } catch {
      setError('Errore nel caricamento immagine')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!form.title.trim() || !form.slug.trim() || !form.categoryId) {
      setError('Titolo, slug e categoria sono obbligatori')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const body = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        categoryId: form.categoryId,
        description: form.description.trim() || null,
        difficulty: form.difficulty,
        protectionLevel: form.protectionLevel,
        allowedRoles: form.allowedRoles,
        estimatedMins: form.estimatedMins ? parseInt(form.estimatedMins) : null,
        coverUrl: form.coverUrl || null,
        isPublished: form.isPublished,
      }

      const url = isEditing ? `/api/training/courses/${courseId}` : '/api/training/courses'
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error ?? 'Errore nel salvataggio')
      }

      setSuccess(true)
      onSaved?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    )
  }

  const inputClass = 'flex h-10 w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm transition-all placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40'

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">
        {isEditing ? 'Modifica Corso' : 'Nuovo Corso'}
      </h2>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-600">
          Corso salvato con successo!
        </div>
      )}

      <div className="rounded-xl border border-border/50 bg-card p-5 space-y-5">
        {/* Title + Slug */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">Titolo *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Es. Sicurezza Informatica Base"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">Slug *</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
              placeholder="sicurezza-informatica-base"
              className={inputClass}
            />
          </div>
        </div>

        {/* Category + Difficulty */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">Categoria *</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
              className={inputClass}
            >
              <option value="">Seleziona categoria...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">Difficolta</label>
            <select
              value={form.difficulty}
              onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value as Difficulty }))}
              className={inputClass}
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted">Descrizione</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            placeholder="Descrizione del corso..."
            className="flex w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm transition-all placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 resize-none"
          />
        </div>

        {/* Protection + Estimated Mins */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">Protezione Contenuti</label>
            <select
              value={form.protectionLevel}
              onChange={(e) => setForm((p) => ({ ...p, protectionLevel: e.target.value as ProtectionLevel }))}
              className={inputClass}
            >
              {PROTECTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">Durata Stimata (minuti)</label>
            <input
              type="number"
              min={1}
              value={form.estimatedMins}
              onChange={(e) => setForm((p) => ({ ...p, estimatedMins: e.target.value }))}
              placeholder="Es. 60"
              className={inputClass}
            />
          </div>
        </div>

        {/* Allowed Roles */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted">Ruoli Ammessi</label>
          <div className="flex flex-wrap gap-2">
            {ALL_ROLES.map((r) => (
              <label key={r.value} className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allowedRoles.includes(r.value)}
                  onChange={() => toggleRole(r.value)}
                  className="h-4 w-4 rounded border-border/50 text-primary focus:ring-primary/30"
                />
                <span className="text-sm text-foreground">{r.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted">Se vuoto, il corso e visibile a tutti i ruoli.</p>
        </div>

        {/* Cover Upload */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted">Immagine di Copertina</label>
          {form.coverUrl ? (
            <div className="relative inline-block">
              <img
                src={form.coverUrl}
                alt="Cover"
                className="h-32 w-auto rounded-lg object-cover border border-border/30"
              />
              <button
                onClick={() => setForm((p) => ({ ...p, coverUrl: '' }))}
                className="absolute -top-2 -right-2 p-1 bg-card rounded-full border border-border/50 text-muted hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 h-32 w-48 rounded-lg border-2 border-dashed border-border/40 hover:border-primary/40 cursor-pointer transition-colors">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted" />
              ) : (
                <>
                  <ImageIcon className="h-5 w-5 text-muted" />
                  <span className="text-xs text-muted">Carica immagine</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleCoverUpload(file)
                }}
              />
            </label>
          )}
        </div>

        {/* Published Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setForm((p) => ({ ...p, isPublished: !p.isPublished }))}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              form.isPublished ? 'bg-primary' : 'bg-secondary'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                form.isPublished ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-sm text-foreground">
            {form.isPublished ? 'Pubblicato' : 'Bozza'}
          </span>
        </div>

        {/* Save */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salva Corso
          </button>
        </div>
      </div>
    </div>
  )
}
