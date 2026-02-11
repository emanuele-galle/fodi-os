'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

interface NewChannelModalProps {
  open: boolean
  onClose: () => void
  onCreated: (channel: { id: string; name: string }) => void
}

const TYPE_OPTIONS = [
  { value: 'PUBLIC', label: 'Pubblico' },
  { value: 'PRIVATE', label: 'Privato' },
  { value: 'DIRECT', label: 'Messaggio Diretto' },
]

export function NewChannelModal({ open, onClose, onCreated }: NewChannelModalProps) {
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)

    const form = new FormData(e.currentTarget)
    const name = (form.get('name') as string)?.trim()
    const description = (form.get('description') as string)?.trim()
    const type = form.get('type') as string

    try {
      const res = await fetch('/api/chat/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          type,
        }),
      })

      if (res.ok) {
        const channel = await res.json()
        onCreated(channel)
        onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuovo Canale">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input name="name" label="Nome canale *" required placeholder="es. generale" />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground">Descrizione</label>
          <textarea
            name="description"
            rows={3}
            className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            placeholder="Descrizione del canale (opzionale)"
          />
        </div>
        <Select name="type" label="Tipo" options={TYPE_OPTIONS} />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creazione...' : 'Crea Canale'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
