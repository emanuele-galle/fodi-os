'use client'

import { useState, useEffect, useCallback } from 'react'
import { RotateCcw, Pause, Play, Trash2, Link as LinkIcon } from 'lucide-react'
import { describeRecurrence } from '@/lib/recurrence-utils'
import type { RecurrenceFrequencyType } from '@/lib/recurrence-utils'

interface RecurrenceRule {
  id: string
  frequency: RecurrenceFrequencyType
  interval: number
  weekDays: number[]
  monthDay: number | null
  startDate: string
  endDate: string | null
  maxOccurrences: number | null
  occurrenceCount: number
  isActive: boolean
  nextRunAt: string
}

interface TaskRecurrenceProps {
  taskId: string
  isTemplate: boolean
  recurrenceTemplateId: string | null
}

const DAY_LABELS = ['D', 'L', 'M', 'M', 'G', 'V', 'S']
const DAY_FULL = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Giornaliero' },
  { value: 'WEEKLY', label: 'Settimanale' },
  { value: 'MONTHLY', label: 'Mensile' },
  { value: 'CUSTOM', label: 'Personalizzato' },
] as const

function RecurrenceInstanceBanner({ recurrenceTemplateId }: { recurrenceTemplateId: string }) {
  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center gap-2 text-sm text-muted">
        <RotateCcw className="h-4 w-4 text-primary" />
        <span>Task generata automaticamente</span>
        <a
          href={`/tasks?taskId=${recurrenceTemplateId}`}
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <LinkIcon className="h-3 w-3" />
          Vedi template
        </a>
      </div>
    </div>
  )
}

function RecurrenceSummary({ rule, onTogglePause, onEdit, onDelete }: {
  rule: RecurrenceRule
  onTogglePause: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCcw className={`h-4 w-4 ${rule.isActive ? 'text-primary' : 'text-muted'}`} />
          <span className={`text-sm ${rule.isActive ? 'text-foreground' : 'text-muted line-through'}`}>
            {describeRecurrence(rule.frequency, rule.interval, rule.weekDays, rule.monthDay)}
          </span>
          {rule.isActive && (
            <span className="text-xs text-muted">({rule.occurrenceCount} generate)</span>
          )}
          {!rule.isActive && (
            <span className="text-xs text-amber-500 font-medium">In pausa</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onTogglePause} className="p-1 rounded hover:bg-secondary transition-colors" title={rule.isActive ? 'Metti in pausa' : 'Riprendi'}>
            {rule.isActive ? <Pause className="h-3.5 w-3.5 text-muted" /> : <Play className="h-3.5 w-3.5 text-primary" />}
          </button>
          <button onClick={onEdit} className="p-1 rounded hover:bg-secondary transition-colors text-xs text-muted hover:text-foreground">
            Modifica
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-destructive/10 transition-colors" title="Rimuovi ricorrenza">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function TaskRecurrence({ taskId, isTemplate, recurrenceTemplateId }: TaskRecurrenceProps) {
  const [rule, setRule] = useState<RecurrenceRule | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [frequency, setFrequency] = useState<RecurrenceFrequencyType>('DAILY')
  const [interval, setInterval] = useState(1)
  const [weekDays, setWeekDays] = useState<number[]>([1, 3, 5]) // Mon, Wed, Fri default
  const [monthDay, setMonthDay] = useState(1)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [maxOccurrences, setMaxOccurrences] = useState('')

  const fetchRule = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/recurrence`)
      if (res.ok) {
        const data = await res.json()
        setRule(data.data)
      } else {
        setRule(null)
      }
    } catch {
      setRule(null)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    if (isTemplate) fetchRule()
    else setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  function populateForm(r: RecurrenceRule) {
    setFrequency(r.frequency)
    setInterval(r.interval)
    setWeekDays(r.weekDays)
    setMonthDay(r.monthDay ?? 1)
    setStartDate(r.startDate.split('T')[0])
    setEndDate(r.endDate ? r.endDate.split('T')[0] : '')
    setMaxOccurrences(r.maxOccurrences?.toString() ?? '')
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const method = rule ? 'PATCH' : 'POST'
      const res = await fetch(`/api/tasks/${taskId}/recurrence`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frequency,
          interval,
          weekDays: frequency === 'WEEKLY' ? weekDays : [],
          monthDay: frequency === 'MONTHLY' ? monthDay : null,
          startDate,
          endDate: endDate || null,
          maxOccurrences: maxOccurrences ? parseInt(maxOccurrences) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Errore nel salvataggio')
        return
      }
      setRule(data.data)
      setEditing(false)
    } catch {
      setError('Errore di connessione')
    } finally {
      setSaving(false)
    }
  }

  async function handleTogglePause() {
    if (!rule) return
    try {
      const res = await fetch(`/api/tasks/${taskId}/recurrence`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive }),
      })
      if (res.ok) {
        const data = await res.json()
        setRule(data.data)
      }
    } catch {}
  }

  async function handleDelete() {
    try {
      await fetch(`/api/tasks/${taskId}/recurrence`, { method: 'DELETE' })
      setRule(null)
      setEditing(false)
    } catch {}
  }

  function toggleWeekDay(day: number) {
    setWeekDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])
  }

  if (loading) return null

  // Generated instance — show link to template
  if (!isTemplate && recurrenceTemplateId) {
    return <RecurrenceInstanceBanner recurrenceTemplateId={recurrenceTemplateId} />
  }

  if (!isTemplate) return null

  // Show summary or add button
  if (!editing && !rule) {
    return (
      <div className="border-t border-border pt-4">
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Aggiungi ricorrenza
        </button>
      </div>
    )
  }

  if (!editing && rule) {
    return (
      <RecurrenceSummary
        rule={rule}
        onTogglePause={handleTogglePause}
        onEdit={() => { populateForm(rule); setEditing(true) }}
        onDelete={handleDelete}
      />
    )
  }

  // Editing form
  return (
    <div className="border-t border-border pt-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <RotateCcw className="h-4 w-4 text-primary" />
        Ricorrenza
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted mb-1 block">Frequenza</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurrenceFrequencyType)}
            className="w-full text-sm rounded-lg border border-border bg-background px-3 py-1.5"
          >
            {FREQUENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {(frequency === 'DAILY' || frequency === 'CUSTOM') && (
          <div>
            <label className="text-xs text-muted mb-1 block">
              {frequency === 'DAILY' ? 'Ogni N giorni' : 'Intervallo (giorni)'}
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
              className="w-full text-sm rounded-lg border border-border bg-background px-3 py-1.5"
            />
          </div>
        )}

        {frequency === 'MONTHLY' && (
          <div>
            <label className="text-xs text-muted mb-1 block">Giorno del mese</label>
            <input
              type="number"
              min={1}
              max={31}
              value={monthDay}
              onChange={(e) => setMonthDay(parseInt(e.target.value) || 1)}
              className="w-full text-sm rounded-lg border border-border bg-background px-3 py-1.5"
            />
          </div>
        )}

        {frequency === 'WEEKLY' && (
          <div>
            <label className="text-xs text-muted mb-1 block">Ogni N settimane</label>
            <input
              type="number"
              min={1}
              max={52}
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
              className="w-full text-sm rounded-lg border border-border bg-background px-3 py-1.5"
            />
          </div>
        )}
      </div>

      {frequency === 'WEEKLY' && (
        <div>
          <label className="text-xs text-muted mb-1 block">Giorni della settimana</label>
          <div className="flex gap-1">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => toggleWeekDay(i)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  weekDays.includes(i)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted hover:bg-secondary/80'
                }`}
                title={DAY_FULL[i]}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted mb-1 block">Data inizio</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full text-sm rounded-lg border border-border bg-background px-3 py-1.5"
          />
        </div>
        <div>
          <label className="text-xs text-muted mb-1 block">Data fine (opzionale)</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full text-sm rounded-lg border border-border bg-background px-3 py-1.5"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted mb-1 block">Max occorrenze (opzionale)</label>
        <input
          type="number"
          min={1}
          value={maxOccurrences}
          onChange={(e) => setMaxOccurrences(e.target.value)}
          placeholder="Illimitato"
          className="w-full text-sm rounded-lg border border-border bg-background px-3 py-1.5"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={() => setEditing(false)}
          className="px-3 py-1.5 text-sm rounded-lg hover:bg-secondary transition-colors"
        >
          Annulla
        </button>
        <button
          onClick={handleSave}
          disabled={saving || (frequency === 'WEEKLY' && weekDays.length === 0)}
          className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>
    </div>
  )
}
