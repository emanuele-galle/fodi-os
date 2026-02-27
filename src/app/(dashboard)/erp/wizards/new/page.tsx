'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { ArrowLeft, Wand2 } from 'lucide-react'

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'Generale' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'analisi', label: 'Analisi bisogni' },
  { value: 'preventivo', label: 'Pre-preventivo' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'survey', label: 'Sondaggio' },
]

export default function NewWizardPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Il nome e obbligatorio')
      return
    }

    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/wizards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, category }),
      })

      if (res.ok) {
        const wizard = await res.json()
        router.push(`/erp/wizards/${wizard.id}`)
      } else {
        const data = await res.json()
        setError(data.error || 'Errore nella creazione')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/erp/wizards')} aria-label="Torna ai wizard">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Wand2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Nuovo Wizard</h1>
            <p className="text-xs text-muted">Crea un nuovo questionario interattivo</p>
          </div>
        </div>
      </div>

      <Card>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Nome wizard *</label>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
              placeholder="es. Raccolta Info Nuovo Cliente"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Descrizione</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border/60 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
              placeholder="Descrizione opzionale del wizard..."
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Categoria</label>
            <Select
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => router.push('/erp/wizards')}>
              Annulla
            </Button>
            <Button onClick={handleCreate} loading={saving} disabled={!name.trim()}>
              Crea Wizard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
