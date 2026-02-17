'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

interface CardData {
  jobTitle: string | null
  department: string | null
  cardBio: string | null
  linkedinUrl: string | null
  instagramUrl: string | null
  twitterUrl: string | null
  githubUrl: string | null
  websiteUrl: string | null
  whatsappNumber: string | null
  showWizards: boolean
  isEnabled: boolean
  showBooking: boolean
  bookingDuration: number
  bookingDaysAhead: number
  bookingStartHour: number
  bookingEndHour: number
}

interface DigitalCardFormProps {
  card: CardData
  onSave: (updates: Partial<CardData>) => Promise<boolean>
}

export function DigitalCardForm({ card, onSave }: DigitalCardFormProps) {
  const [formData, setFormData] = useState<CardData>(card)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleChange(field: keyof CardData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    setSaving(true)
    setMessage(null)
    try {
      const success = await onSave(formData)
      if (success) {
        setMessage({ type: 'success', text: 'Card salvata con successo!' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: 'Errore nel salvataggio' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Errore di rete' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent>
        <div className="space-y-6">
          {/* Professional */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Informazioni Professionali</h3>
            <div className="space-y-3">
              <Input
                label="Titolo Professionale"
                placeholder="es. Full Stack Developer"
                value={formData.jobTitle || ''}
                onChange={(e) => handleChange('jobTitle', e.target.value)}
              />
              <Input
                label="Dipartimento"
                placeholder="es. Sviluppo Software"
                value={formData.department || ''}
                onChange={(e) => handleChange('department', e.target.value)}
              />
              <Textarea
                label="Bio"
                placeholder="Breve descrizione professionale..."
                rows={4}
                value={formData.cardBio || ''}
                onChange={(e) => handleChange('cardBio', e.target.value)}
              />
            </div>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Social & Contatti</h3>
            <div className="space-y-3">
              <Input
                label="LinkedIn URL"
                placeholder="https://linkedin.com/in/..."
                value={formData.linkedinUrl || ''}
                onChange={(e) => handleChange('linkedinUrl', e.target.value)}
              />
              <Input
                label="Instagram URL"
                placeholder="https://instagram.com/..."
                value={formData.instagramUrl || ''}
                onChange={(e) => handleChange('instagramUrl', e.target.value)}
              />
              <Input
                label="Twitter/X URL"
                placeholder="https://twitter.com/..."
                value={formData.twitterUrl || ''}
                onChange={(e) => handleChange('twitterUrl', e.target.value)}
              />
              <Input
                label="GitHub URL"
                placeholder="https://github.com/..."
                value={formData.githubUrl || ''}
                onChange={(e) => handleChange('githubUrl', e.target.value)}
              />
              <Input
                label="Sito Web URL"
                placeholder="https://..."
                value={formData.websiteUrl || ''}
                onChange={(e) => handleChange('websiteUrl', e.target.value)}
              />
              <Input
                label="WhatsApp (numero con prefisso)"
                placeholder="+39 123 456 7890"
                value={formData.whatsappNumber || ''}
                onChange={(e) => handleChange('whatsappNumber', e.target.value)}
              />
            </div>
          </div>

          {/* Options */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Opzioni</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showWizards}
                  onChange={(e) => handleChange('showWizards', e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm">Mostra wizards sulla card</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isEnabled}
                  onChange={(e) => handleChange('isEnabled', e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm">Card abilitata (pubblica)</span>
              </label>
            </div>
          </div>

          {/* Booking */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Prenotazione Appuntamenti</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showBooking}
                  onChange={(e) => handleChange('showBooking', e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm">Abilita prenotazione appuntamenti</span>
              </label>
              {formData.showBooking && (
                <div className="space-y-3 pl-6 border-l-2 border-purple-500/20">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Durata (min)"
                      type="number"
                      min={15}
                      max={120}
                      step={15}
                      value={String(formData.bookingDuration)}
                      onChange={(e) => handleChange('bookingDuration', Number(e.target.value) as unknown as string)}
                    />
                    <Input
                      label="Giorni anticipazione"
                      type="number"
                      min={1}
                      max={60}
                      value={String(formData.bookingDaysAhead)}
                      onChange={(e) => handleChange('bookingDaysAhead', Number(e.target.value) as unknown as string)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Ora inizio"
                      type="number"
                      min={0}
                      max={23}
                      value={String(formData.bookingStartHour)}
                      onChange={(e) => handleChange('bookingStartHour', Number(e.target.value) as unknown as string)}
                    />
                    <Input
                      label="Ora fine"
                      type="number"
                      min={1}
                      max={24}
                      value={String(formData.bookingEndHour)}
                      onChange={(e) => handleChange('bookingEndHour', Number(e.target.value) as unknown as string)}
                    />
                  </div>
                  <p className="text-xs text-muted">
                    Richiede Google Calendar collegato. Gli slot vengono calcolati sottraendo gli eventi già presenti.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700'
                  : 'bg-destructive/10 border border-destructive/20 text-destructive'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Save */}
          <Button onClick={handleSubmit} loading={saving} className="w-full">
            Salva Modifiche
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
