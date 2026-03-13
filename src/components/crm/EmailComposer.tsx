'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { Select } from '@/components/ui/Select'
import { Sparkles, Loader2, Send, AlertCircle, CheckCircle2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/Skeleton'

const RichTextEditor = dynamic(
  () => import('@/components/shared/RichTextEditor').then(m => ({ default: m.RichTextEditor })),
  { loading: () => <Skeleton className="h-48 w-full rounded-lg" /> },
)

const SCENARIOS = [
  { value: 'followup', label: 'Follow-up' },
  { value: 'reengagement', label: 'Re-engagement' },
  { value: 'thank_you', label: 'Ringraziamento' },
  { value: 'project_update', label: 'Aggiornamento Progetto' },
  { value: 'proposta_consulenza', label: 'Proposta Consulenza' },
  { value: 'presentazione_servizi', label: 'Presentazione Servizi' },
  { value: 'richiesta_feedback', label: 'Richiesta Feedback' },
  { value: 'invito_evento', label: 'Invito Evento' },
  { value: 'proposta_collaborazione', label: 'Proposta Collaborazione' },
  { value: 'custom', label: 'Personalizzato' },
]

interface ClientOption { value: string; label: string }
interface ContactOption { id: string; firstName: string; lastName: string; email: string | null; isPrimary: boolean }

interface EmailComposerProps {
  initialClientId?: string
}

export function EmailComposer({ initialClientId }: EmailComposerProps) {
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientId, setClientId] = useState(initialClientId || '')
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [contactId, setContactId] = useState('')
  const [scenario, setScenario] = useState('followup')
  const [customPrompt, setCustomPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Load clients
  useEffect(() => {
    fetch('/api/clients?limit=500&select=id,companyName')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          const list = Array.isArray(data.data) ? data.data : data.data.clients || []
          setClients(list.map((c: { id: string; companyName: string }) => ({ value: c.id, label: c.companyName })))
        }
      })
      .catch(() => { /* silent */ })
  }, [])

  // Load contacts when client changes
  useEffect(() => {
    if (!clientId) {
      setContacts([])
      setContactId('')
      return
    }
    fetch(`/api/clients/${clientId}/contacts`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setContacts(data.data)
          // Pre-select primary contact with email
          const primary = data.data.find((c: ContactOption) => c.isPrimary && c.email) || data.data.find((c: ContactOption) => c.email)
          if (primary) setContactId(primary.id)
        }
      })
      .catch(() => { /* silent */ })
  }, [clientId])

  const handleGenerate = useCallback(async () => {
    if (!clientId) return
    setGenerating(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/crm/email-compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          contactId: contactId || undefined,
          scenario,
          customPrompt: scenario === 'custom' ? customPrompt : undefined,
        }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        setSubject(data.data.subject)
        setBodyHtml(data.data.bodyHtml)
        setContactEmail(data.data.contactEmail)
        if (data.data.contactId) setContactId(data.data.contactId)
      } else {
        setFeedback({ type: 'error', message: data.error || 'Errore nella generazione' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Errore di rete' })
    } finally {
      setGenerating(false)
    }
  }, [clientId, contactId, scenario, customPrompt])

  const handleSend = useCallback(async () => {
    if (!clientId || !contactEmail || !subject || !bodyHtml) return
    if (!confirm(`Inviare email a ${contactEmail}?`)) return
    setSending(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/crm/email-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          contactId: contactId || undefined,
          contactEmail,
          subject,
          bodyHtml,
          scenario,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setFeedback({ type: 'success', message: 'Email inviata con successo!' })
        setSubject('')
        setBodyHtml('')
        setContactEmail('')
      } else {
        setFeedback({ type: 'error', message: data.error || 'Errore nell\'invio' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Errore di rete' })
    } finally {
      setSending(false)
    }
  }, [clientId, contactId, contactEmail, subject, bodyHtml, scenario])

  const handleScenarioChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setScenario(e.target.value), [])
  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomPrompt(e.target.value), [])
  const handleSubjectChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value), [])

  const contactOptions = contacts
    .filter(c => c.email)
    .map(c => ({ value: c.id, label: `${c.firstName} ${c.lastName} — ${c.email}` }))

  return (
    <div className="space-y-5">
      {/* Client & Contact selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchableSelect
          label="Cliente"
          options={clients}
          value={clientId}
          onChange={setClientId}
          placeholder="Seleziona cliente..."
          required
        />
        {contactOptions.length > 0 && (
          <SearchableSelect
            label="Contatto"
            options={contactOptions}
            value={contactId}
            onChange={setContactId}
            placeholder="Seleziona contatto..."
          />
        )}
      </div>

      {/* Scenario */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Scenario"
          options={SCENARIOS}
          value={scenario}
          onChange={handleScenarioChange}
        />
      </div>

      {/* Custom prompt */}
      {scenario === 'custom' && (
        <div>
          <label className="text-sm font-medium mb-1.5 block">Prompt personalizzato</label>
          <textarea
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm min-h-[80px]"
            value={customPrompt}
            onChange={handlePromptChange}
            placeholder="Descrivi il tipo di email da generare..."
          />
        </div>
      )}

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={generating || !clientId || (scenario === 'custom' && !customPrompt.trim())}
      >
        {generating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
        Genera con AI
      </Button>

      {/* Subject field */}
      {subject && (
        <div>
          <label className="text-sm font-medium mb-1.5 block">Oggetto</label>
          <input
            type="text"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            value={subject}
            onChange={handleSubjectChange}
          />
        </div>
      )}

      {/* Rich text editor */}
      {bodyHtml && (
        <div>
          <label className="text-sm font-medium mb-1.5 block">Corpo Email</label>
          <RichTextEditor
            content={bodyHtml}
            onChange={setBodyHtml}
            placeholder="Il contenuto dell'email appare qui..."
          />
        </div>
      )}

      {/* Contact email display */}
      {contactEmail && (
        <p className="text-sm text-muted">
          Destinatario: <span className="text-foreground font-medium">{contactEmail}</span>
        </p>
      )}

      {/* Send button */}
      {bodyHtml && (
        <Button onClick={handleSend} disabled={sending || !subject || !bodyHtml || !contactEmail}>
          {sending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
          Invia Email
        </Button>
      )}

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'border-destructive/30 bg-destructive/5 text-destructive'}`}>
          {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          {feedback.message}
        </div>
      )}
    </div>
  )
}
