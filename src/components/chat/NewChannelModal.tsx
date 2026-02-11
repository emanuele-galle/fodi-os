'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  role: string
}

interface NewChannelModalProps {
  open: boolean
  onClose: () => void
  onCreated: (channel: { id: string; name: string }) => void
  teamMembers?: TeamMember[]
  currentUserId?: string
}

const TYPE_OPTIONS = [
  { value: 'PUBLIC', label: 'Pubblico - Tutti possono vedere' },
  { value: 'PRIVATE', label: 'Privato - Solo invitati' },
  { value: 'DIRECT', label: 'Messaggio Diretto' },
]

export function NewChannelModal({ open, onClose, onCreated, teamMembers = [], currentUserId }: NewChannelModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [channelType, setChannelType] = useState('PUBLIC')

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setError('')
      setSelectedMembers([])
      setChannelType('PUBLIC')
    }
  }, [open])

  const otherMembers = teamMembers.filter((m) => m.id !== currentUserId)

  function toggleMember(id: string) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const name = (form.get('name') as string)?.trim()
    const description = (form.get('description') as string)?.trim()

    try {
      const res = await fetch('/api/chat/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          type: channelType,
          memberIds: selectedMembers.length > 0 ? selectedMembers : undefined,
        }),
      })

      if (res.ok) {
        const channel = await res.json()
        onCreated(channel)
        onClose()
      } else {
        const data = await res.json().catch(() => null)
        setError(data?.error || `Errore nella creazione (${res.status})`)
      }
    } catch {
      setError('Errore di connessione')
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
            rows={2}
            className="flex w-full rounded-xl border border-border/50 bg-secondary/40 px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all"
            placeholder="Descrizione del canale (opzionale)"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground">Tipo</label>
          <select
            value={channelType}
            onChange={(e) => setChannelType(e.target.value)}
            className="flex h-10 w-full rounded-xl border border-border/50 bg-secondary/40 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Member selection */}
        {otherMembers.length > 0 && (channelType === 'PRIVATE' || channelType === 'DIRECT') && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Aggiungi membri {channelType === 'DIRECT' && '*'}
            </label>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-border/50 bg-secondary/20 divide-y divide-border/30">
              {otherMembers.map((member) => {
                const selected = selectedMembers.includes(member.id)
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleMember(member.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
                      selected ? 'bg-primary/10' : 'hover:bg-secondary/60'
                    )}
                  >
                    <Avatar
                      name={`${member.firstName} ${member.lastName}`}
                      src={member.avatarUrl}
                      size="sm"
                      className="!h-7 !w-7 !text-[10px]"
                    />
                    <span className="text-sm flex-1 truncate">
                      {member.firstName} {member.lastName}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 uppercase">{member.role}</span>
                    {selected && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
            {selectedMembers.length > 0 && (
              <p className="text-xs text-muted-foreground/60">
                {selectedMembers.length} membr{selectedMembers.length === 1 ? 'o' : 'i'} selezionat{selectedMembers.length === 1 ? 'o' : 'i'}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
            {error}
          </div>
        )}

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
