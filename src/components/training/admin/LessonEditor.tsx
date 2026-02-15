'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save, Loader2, Upload, Trash2, Paperclip, FileText } from 'lucide-react'
import { QuizBuilder } from './QuizBuilder'

type ContentType = 'TEXT' | 'VIDEO' | 'QUIZ' | 'MIXED'

interface Attachment {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
}

interface Quiz {
  id?: string
  question: string
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE'
  options: { label: string; value: string }[]
  correctAnswer: string | string[]
  explanation: string
  sortOrder: number
}

interface LessonForm {
  title: string
  slug: string
  contentType: ContentType
  content: string
  videoUrl: string
  videoDurationSecs: string
  isPublished: boolean
}

const EMPTY_FORM: LessonForm = {
  title: '',
  slug: '',
  contentType: 'TEXT',
  content: '',
  videoUrl: '',
  videoDurationSecs: '',
  isPublished: false,
}

const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: 'TEXT', label: 'Testo' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'MIXED', label: 'Misto' },
]

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface LessonEditorProps {
  courseId: string
  lessonId?: string
  onSaved?: () => void
}

export function LessonEditor({ courseId, lessonId, onSaved }: LessonEditorProps) {
  const [form, setForm] = useState<LessonForm>(EMPTY_FORM)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(!!lessonId)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const isEditing = !!lessonId

  const fetchLesson = useCallback(async () => {
    if (!lessonId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/training/lessons/${lessonId}`, { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        const l = json.data
        setForm({
          title: l.title,
          slug: l.slug,
          contentType: l.contentType,
          content: typeof l.content === 'string' ? l.content : (l.contentText ?? JSON.stringify(l.content ?? '')),
          videoUrl: l.videoUrl ?? '',
          videoDurationSecs: l.videoDurationSecs?.toString() ?? '',
          isPublished: l.isPublished,
        })
        setAttachments(l.attachments ?? [])
        setQuizzes(
          (l.quizzes ?? []).map((q: Record<string, unknown>) => ({
            id: q.id,
            question: q.question,
            type: q.type,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation ?? '',
            sortOrder: q.sortOrder ?? 0,
          }))
        )
      }
    } catch {
      setError('Impossibile caricare la lezione')
    } finally {
      setLoading(false)
    }
  }, [lessonId])

  useEffect(() => {
    fetchLesson()
  }, [fetchLesson])

  function handleTitleChange(title: string) {
    setForm((p) => ({
      ...p,
      title,
      slug: isEditing ? p.slug : slugify(title),
    }))
  }

  async function handleVideoUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('courseSlug', 'lesson-video')
      const res = await fetch('/api/training/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      if (res.ok) {
        const json = await res.json()
        setForm((p) => ({ ...p, videoUrl: json.data.url }))
      }
    } catch {
      setError('Errore nel caricamento video')
    } finally {
      setUploading(false)
    }
  }

  async function handleAttachmentUpload(file: File) {
    if (!lessonId) {
      setError('Salva prima la lezione per aggiungere allegati')
      return
    }
    setUploadingAttachment(true)
    try {
      // Upload file
      const fd = new FormData()
      fd.append('file', file)
      fd.append('courseSlug', 'attachment')
      const uploadRes = await fetch('/api/training/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      if (!uploadRes.ok) throw new Error('Upload fallito')
      const uploadJson = await uploadRes.json()

      // Create attachment record
      const res = await fetch(`/api/training/lessons/${lessonId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fileName: uploadJson.data.fileName,
          fileUrl: uploadJson.data.url,
          fileSize: uploadJson.data.fileSize,
          mimeType: uploadJson.data.mimeType,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setAttachments((prev) => [...prev, json.data])
      }
    } catch {
      setError('Errore nel caricamento allegato')
    } finally {
      setUploadingAttachment(false)
    }
  }

  async function handleDeleteAttachment(id: string) {
    try {
      const res = await fetch(`/api/training/attachments/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== id))
      }
    } catch {
      setError('Errore nella cancellazione allegato')
    }
  }

  async function handleSave() {
    if (!form.title.trim() || !form.slug.trim()) {
      setError('Titolo e slug sono obbligatori')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const body = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        contentType: form.contentType,
        contentText: form.content || null,
        content: form.content || null,
        videoUrl: form.videoUrl || null,
        videoDurationSecs: form.videoDurationSecs ? parseInt(form.videoDurationSecs) : null,
        isPublished: form.isPublished,
      }

      const url = isEditing
        ? `/api/training/lessons/${lessonId}`
        : `/api/training/courses/${courseId}/lessons`
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
  const showVideo = form.contentType === 'VIDEO' || form.contentType === 'MIXED'
  const showQuiz = form.contentType === 'QUIZ' || form.contentType === 'MIXED'

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">
        {isEditing ? 'Modifica Lezione' : 'Nuova Lezione'}
      </h2>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-600">
          Lezione salvata con successo!
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
              placeholder="Es. Introduzione alla Sicurezza"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">Slug *</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
              placeholder="introduzione-alla-sicurezza"
              className={inputClass}
            />
          </div>
        </div>

        {/* Content Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted">Tipo di Contenuto</label>
          <select
            value={form.contentType}
            onChange={(e) => setForm((p) => ({ ...p, contentType: e.target.value as ContentType }))}
            className={inputClass}
          >
            {CONTENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Content Text */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted">Contenuto</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
            rows={8}
            placeholder="Scrivi il contenuto della lezione..."
            className="flex w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm transition-all placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 resize-y font-mono"
          />
        </div>

        {/* Video Upload */}
        {showVideo && (
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted">Video</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted">URL Video</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.videoUrl}
                    onChange={(e) => setForm((p) => ({ ...p, videoUrl: e.target.value }))}
                    placeholder="URL del video..."
                    className={inputClass}
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors shrink-0">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleVideoUpload(file)
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted">Durata (secondi)</label>
                <input
                  type="number"
                  min={0}
                  value={form.videoDurationSecs}
                  onChange={(e) => setForm((p) => ({ ...p, videoDurationSecs: e.target.value }))}
                  placeholder="Es. 300"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* Attachments */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted">Allegati</label>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors">
              {uploadingAttachment ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Paperclip className="h-3.5 w-3.5" />
              )}
              Carica Allegato
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleAttachmentUpload(file)
                }}
              />
            </label>
          </div>
          {attachments.length === 0 ? (
            <p className="text-xs text-muted py-2">Nessun allegato</p>
          ) : (
            <div className="space-y-1.5">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border/20"
                >
                  <FileText className="h-4 w-4 text-muted shrink-0" />
                  <a
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm text-foreground truncate hover:text-primary transition-colors"
                  >
                    {att.fileName}
                  </a>
                  <span className="text-xs text-muted shrink-0">{formatFileSize(att.fileSize)}</span>
                  <button
                    onClick={() => handleDeleteAttachment(att.id)}
                    className="p-1 text-muted hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quiz Builder */}
        {showQuiz && lessonId && (
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted">Quiz</label>
            <QuizBuilder
              lessonId={lessonId}
              quizzes={quizzes}
              onChange={setQuizzes}
            />
          </div>
        )}

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
            {form.isPublished ? 'Pubblicata' : 'Bozza'}
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
            Salva Lezione
          </button>
        </div>
      </div>
    </div>
  )
}
