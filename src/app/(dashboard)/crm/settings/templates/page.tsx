'use client'

import { useState, useCallback } from 'react'
import { useFetch } from '@/hooks/useFetch'
import { sanitizeEmailHtml } from '@/lib/sanitize-email-html'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Plus, Trash2, Pencil, Mail, Power, PowerOff, Sparkles, Loader2, Eye } from 'lucide-react'

interface EmailTemplate {
  id: string
  name: string
  slug: string
  subject: string
  bodyHtml: string
  category: string
  variables: string[]
  isActive: boolean
  createdAt: string
}

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'Generale' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'reengagement', label: 'Re-engagement' },
  { value: 'welcome', label: 'Benvenuto' },
  { value: 'anniversary', label: 'Anniversario' },
  { value: 'project', label: 'Progetto' },
]

export default function TemplatesSettingsPage() {
  const { data: raw, loading, refetch } = useFetch<{ success: boolean; data: EmailTemplate[] }>('/api/crm/templates')
  const templates = raw?.success ? raw.data : []

  const [createOpen, setCreateOpen] = useState(false)
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [form, setForm] = useState({
    name: '', slug: '', subject: '', bodyHtml: '', category: 'general', variables: '',
  })

  const resetForm = useCallback(() => {
    setForm({ name: '', slug: '', subject: '', bodyHtml: '', category: 'general', variables: '' })
  }, [])

  const openCreate = useCallback(() => { resetForm(); setCreateOpen(true) }, [resetForm])

  const openEdit = useCallback((t: EmailTemplate) => {
    setForm({
      name: t.name, slug: t.slug, subject: t.subject, bodyHtml: t.bodyHtml,
      category: t.category, variables: t.variables.join(', '),
    })
    setEditTemplate(t)
  }, [])

  const handleSave = useCallback(async () => {
    if (!form.name.trim() || !form.slug.trim()) return
    setSubmitting(true)

    const body = {
      name: form.name, slug: form.slug, subject: form.subject,
      bodyHtml: form.bodyHtml, category: form.category,
      variables: form.variables.split(',').map(v => v.trim()).filter(Boolean),
    }

    try {
      const url = editTemplate ? `/api/crm/templates/${editTemplate.id}` : '/api/crm/templates'
      const res = await fetch(url, {
        method: editTemplate ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) { setCreateOpen(false); setEditTemplate(null); refetch() }
    } finally { setSubmitting(false) }
  }, [form, editTemplate, refetch])

  const handleDelete = useCallback(async () => {
    if (!deleteId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/crm/templates/${deleteId}`, { method: 'DELETE' })
      if (res.ok) { setDeleteId(null); refetch() }
    } finally { setSubmitting(false) }
  }, [deleteId, refetch])

  const handleToggle = useCallback(async (t: EmailTemplate) => {
    await fetch(`/api/crm/templates/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !t.isActive }),
    })
    refetch()
  }, [refetch])

  const handleGenerate = useCallback(async () => {
    if (!form.category) return
    setGenerating(true)
    try {
      const res = await fetch('/api/crm/email-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: 'template-preview', scenario: form.category, customPrompt: form.name || undefined }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        setForm(prev => ({
          ...prev,
          subject: data.data.subject || prev.subject,
          bodyHtml: data.data.bodyHtml || prev.bodyHtml,
        }))
      }
    } finally { setGenerating(false) }
  }, [form.category, form.name])

  const handleFormChange = useCallback((field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }, [])

  const closeModal = useCallback(() => { setCreateOpen(false); setEditTemplate(null) }, [])
  const closeDelete = useCallback(() => setDeleteId(null), [])
  const closePreview = useCallback(() => setPreviewHtml(null), [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Template Email</h1>
          <p className="text-muted mt-1">Gestisci i template per le email automatiche e manuali</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nuovo Template
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted">Caricamento...</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Mail className="h-8 w-8 text-muted mx-auto mb-3" />
            <p className="text-muted">Nessun template email. Crea il primo!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => handleToggle(t)}
                    className={`flex-shrink-0 ${t.isActive ? 'text-emerald-500' : 'text-muted'}`}
                  >
                    {t.isActive ? <Power className="h-5 w-5" /> : <PowerOff className="h-5 w-5" />}
                  </button>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${!t.isActive ? 'text-muted' : ''}`}>{t.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{t.category}</Badge>
                      <span className="text-xs text-muted truncate">{t.subject}</span>
                    </div>
                    {t.variables.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {t.variables.map(v => (
                          <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">{`{${v}}`}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => setPreviewHtml(t.bodyHtml)} title="Anteprima">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={createOpen || !!editTemplate} onClose={closeModal} title={editTemplate ? 'Modifica Template' : 'Nuovo Template'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome" value={form.name} onChange={handleFormChange('name')} placeholder="es. Follow-up 7gg" />
            <Input label="Slug" value={form.slug} onChange={handleFormChange('slug')} placeholder="es. followup-7gg" disabled={!!editTemplate} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Categoria" options={CATEGORY_OPTIONS} value={form.category} onChange={handleFormChange('category')} />
            <Input label="Variabili (comma-sep)" value={form.variables} onChange={handleFormChange('variables')} placeholder="firstName, companyName" />
          </div>
          <Input label="Oggetto" value={form.subject} onChange={handleFormChange('subject')} placeholder="Oggetto dell'email" />
          <div>
            <label className="text-sm font-medium mb-1.5 block">Corpo HTML</label>
            <textarea
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm min-h-[150px] font-mono"
              value={form.bodyHtml}
              onChange={handleFormChange('bodyHtml')}
              placeholder="<p>Ciao {firstName},</p>"
            />
          </div>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
              Genera con AI
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeModal}>Annulla</Button>
              <Button onClick={handleSave} disabled={!form.name.trim() || !form.slug.trim() || submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {editTemplate ? 'Salva' : 'Crea'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal open={!!previewHtml} onClose={closePreview} title="Anteprima Template" size="lg">
        {previewHtml && (
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(previewHtml) }} />
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteId} onClose={closeDelete} title="Elimina Template" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted">Sei sicuro di voler eliminare questo template?</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDelete}>Annulla</Button>
            <Button variant="destructive" onClick={handleDelete} loading={submitting}>Elimina</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
