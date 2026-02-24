'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Clock,
  Calendar,
  Settings2,
  Ban,
  Trash2,
  Plus,
  ArrowLeft,
  Repeat,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const DAY_LABELS_FULL = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
// Display order: Mon-Sun
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

type DaySchedule = { start: number; end: number }
type WorkSchedule = Record<string, DaySchedule>

const DEFAULT_SCHEDULE: WorkSchedule = {
  '1': { start: 9, end: 18 },
  '2': { start: 9, end: 18 },
  '3': { start: 9, end: 18 },
  '4': { start: 9, end: 18 },
  '5': { start: 9, end: 18 },
}

interface BlockEvent {
  id: string
  summary: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  recurringEventId?: string
  _calendarId?: string
}

function formatBlockDate(start: BlockEvent['start']) {
  const dt = start.dateTime || start.date || ''
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatBlockTime(start: BlockEvent['start'], end: BlockEvent['end']) {
  if (start.date) return 'Tutto il giorno'
  const s = start.dateTime ? new Date(start.dateTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : ''
  const e = end.dateTime ? new Date(end.dateTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : ''
  return `${s} - ${e}`
}

function hourOptions(minHour = 0, maxHour = 24) {
  return Array.from({ length: maxHour - minHour }, (_, i) => {
    const h = minHour + i
    return { value: h, label: `${String(h).padStart(2, '0')}:00` }
  })
}

export default function AvailabilityPage() {
  // Working schedule state (per-day)
  const [schedule, setSchedule] = useState<WorkSchedule>(DEFAULT_SCHEDULE)
  const [savingHours, setSavingHours] = useState(false)
  const [hoursLoaded, setHoursLoaded] = useState(false)

  // Booking settings state
  const [showBooking, setShowBooking] = useState(false)
  const [bookingDuration, setBookingDuration] = useState(30)
  const [bookingDaysAhead, setBookingDaysAhead] = useState(14)
  const [savingBooking, setSavingBooking] = useState(false)
  const [bookingLoaded, setBookingLoaded] = useState(false)

  // Blocks state
  const [blocks, setBlocks] = useState<BlockEvent[]>([])
  const [blocksLoading, setBlocksLoading] = useState(true)
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null)

  // New block form
  const [showNewBlock, setShowNewBlock] = useState(false)
  const [newBlock, setNewBlock] = useState({ date: '', startTime: '09:00', endTime: '18:00', reason: '' })
  const [creatingBlock, setCreatingBlock] = useState(false)
  const [userId, setUserId] = useState('')

  // Target calendar for blocks
  const [targetCalendarId, setTargetCalendarId] = useState('')

  // Feedback messages
  const [hoursSaved, setHoursSaved] = useState(false)
  const [bookingSaved, setBookingSaved] = useState(false)

  // Load session + work schedule + target calendar
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.user) {
          setUserId(data.user.id)
          if (data.user.workSchedule) {
            const ws = typeof data.user.workSchedule === 'string'
              ? JSON.parse(data.user.workSchedule)
              : data.user.workSchedule
            setSchedule(ws)
          }
          setHoursLoaded(true)
        }
      })
      .catch(() => {})
    // Fetch calendars to find the target calendar for blocks
    fetch('/api/calendar')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.calendars) {
          const fodiCal = data.calendars.find((c: { summary: string }) =>
            c.summary.toLowerCase().includes('fodi')
          )
          if (fodiCal) setTargetCalendarId(fodiCal.id)
        }
      })
      .catch(() => {})
  }, [])

  // Load booking settings
  useEffect(() => {
    fetch('/api/digital-card')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setShowBooking(data.showBooking ?? false)
          setBookingDuration(data.bookingDuration ?? 30)
          setBookingDaysAhead(data.bookingDaysAhead ?? 14)
          setBookingLoaded(true)
        }
      })
      .catch(() => {})
  }, [])

  // Load blocks
  const fetchBlocks = useCallback(async () => {
    setBlocksLoading(true)
    try {
      const res = await fetch('/api/availability/blocks')
      const data = await res.json()
      setBlocks(data.events || [])
    } catch {
      // ignore
    } finally {
      setBlocksLoading(false)
    }
  }, [])

  useEffect(() => { fetchBlocks() }, [fetchBlocks])

  // Toggle day on/off
  const toggleDay = (day: number) => {
    const key = String(day)
    setSchedule((prev) => {
      if (prev[key]) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: { start: 9, end: 18 } }
    })
  }

  // Update day hours
  const updateDayHours = (day: number, field: 'start' | 'end', value: number) => {
    const key = String(day)
    setSchedule((prev) => {
      if (!prev[key]) return prev
      return { ...prev, [key]: { ...prev[key], [field]: value } }
    })
  }

  // Save working hours
  const saveWorkingHours = async () => {
    setSavingHours(true)
    setHoursSaved(false)
    try {
      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workSchedule: schedule }),
      })
      setHoursSaved(true)
      setTimeout(() => setHoursSaved(false), 2000)
    } catch {
      // ignore
    } finally {
      setSavingHours(false)
    }
  }

  // Save booking settings
  const saveBookingSettings = async () => {
    setSavingBooking(true)
    setBookingSaved(false)
    try {
      await fetch('/api/digital-card', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showBooking, bookingDuration, bookingDaysAhead }),
      })
      setBookingSaved(true)
      setTimeout(() => setBookingSaved(false), 2000)
    } catch {
      // ignore
    } finally {
      setSavingBooking(false)
    }
  }

  // Delete block
  const deleteBlock = async (eventId: string, calId?: string) => {
    setDeletingBlockId(eventId)
    try {
      const calParam = calId && calId !== 'primary' ? `?calendarId=${encodeURIComponent(calId)}` : ''
      await fetch(`/api/calendar/events/${eventId}${calParam}`, { method: 'DELETE' })
      setBlocks((prev) => prev.filter((b) => b.id !== eventId))
    } catch {
      // ignore
    } finally {
      setDeletingBlockId(null)
    }
  }

  // Create new block
  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBlock.date || !userId) return
    setCreatingBlock(true)
    try {
      const start = `${newBlock.date}T${newBlock.startTime}:00`
      const end = `${newBlock.date}T${newBlock.endTime}:00`
      const res = await fetch('/api/availability/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          start,
          end,
          title: newBlock.reason || undefined,
          ...(targetCalendarId && { calendarId: targetCalendarId }),
        }),
      })
      if (res.ok) {
        setShowNewBlock(false)
        setNewBlock({ date: '', startTime: '09:00', endTime: '18:00', reason: '' })
        fetchBlocks()
      }
    } catch {
      // ignore
    } finally {
      setCreatingBlock(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/calendar" className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-muted" />
        </Link>
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5">
          <Settings2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Gestione Disponibilità</h1>
          <p className="text-sm text-muted">Configura orari lavorativi, prenotazioni e blocchi</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Section 1: Working Hours (per day) */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Orari Lavorativi</h2>
            </div>

            {!hoursLoaded ? (
              <div className="space-y-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <p className="text-sm text-muted mb-4">Attiva i giorni lavorativi e imposta gli orari per ciascun giorno</p>

                <div className="space-y-2">
                  {DAY_ORDER.map((day) => {
                    const key = String(day)
                    const isActive = !!schedule[key]
                    const config = schedule[key]

                    return (
                      <div
                        key={day}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                          isActive ? 'border-primary/20 bg-primary/[0.03]' : 'border-border/50 bg-secondary/20'
                        }`}
                      >
                        {/* Toggle */}
                        <button
                          onClick={() => toggleDay(day)}
                          className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                            isActive ? 'bg-primary' : 'bg-border'
                          }`}
                        >
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            isActive ? 'translate-x-4' : ''
                          }`} />
                        </button>

                        {/* Day label */}
                        <span className={`text-sm font-medium w-20 flex-shrink-0 ${
                          isActive ? 'text-foreground' : 'text-muted'
                        }`}>
                          {DAY_LABELS_FULL[day]}
                        </span>

                        {/* Hours selectors */}
                        {isActive && config ? (
                          <div className="flex items-center gap-2 ml-auto">
                            <select
                              value={config.start}
                              onChange={(e) => updateDayHours(day, 'start', Number(e.target.value))}
                              className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-[80px]"
                            >
                              {hourOptions(0, 24).map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                            <span className="text-muted text-xs">—</span>
                            <select
                              value={config.end}
                              onChange={(e) => updateDayHours(day, 'end', Number(e.target.value))}
                              className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-[80px]"
                            >
                              {hourOptions(1, 25).map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span className="text-xs text-muted ml-auto">Non lavorativo</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <Button size="sm" onClick={saveWorkingHours} loading={savingHours}>
                    Salva Orari
                  </Button>
                  {hoursSaved && (
                    <span className="text-sm text-emerald-600 font-medium animate-fade-in">Salvato!</span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Booking Settings */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Impostazioni Prenotazione</h2>
            </div>

            {!bookingLoaded ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                {/* Toggle booking */}
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <div
                    role="switch"
                    aria-checked={showBooking}
                    onClick={() => setShowBooking(!showBooking)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${showBooking ? 'bg-primary' : 'bg-border'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showBooking ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className="text-sm font-medium">Prenotazioni attive sulla card digitale</span>
                </label>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Durata slot (minuti)</label>
                    <select
                      value={bookingDuration}
                      onChange={(e) => setBookingDuration(Number(e.target.value))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      {[15, 30, 45, 60, 90, 120].map((d) => (
                        <option key={d} value={d}>{d} min</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Giorni di anticipo</label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={bookingDaysAhead}
                      onChange={(e) => setBookingDaysAhead(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button size="sm" onClick={saveBookingSettings} loading={savingBooking}>
                    Salva Prenotazione
                  </Button>
                  {bookingSaved && (
                    <span className="text-sm text-emerald-600 font-medium animate-fade-in">Salvato!</span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Unavailability Blocks */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Blocchi Indisponibilità</h2>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowNewBlock(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Nuovo Blocco
              </Button>
            </div>

            {blocksLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : blocks.length === 0 ? (
              <p className="text-sm text-muted py-6 text-center">
                Nessun blocco di indisponibilità programmato
              </p>
            ) : (
              <div className="space-y-2">
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-secondary/20 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="w-1 self-stretch rounded-full bg-orange-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {block.summary || 'Non disponibile'}
                      </p>
                      <p className="text-xs text-muted">
                        {formatBlockDate(block.start)} &middot; {formatBlockTime(block.start, block.end)}
                      </p>
                    </div>
                    {block.recurringEventId && (
                      <Badge variant="outline" className="flex-shrink-0">
                        <Repeat className="h-3 w-3 mr-1" />
                        Ricorrente
                      </Badge>
                    )}
                    <button
                      onClick={() => deleteBlock(block.id, block._calendarId)}
                      disabled={deletingBlockId === block.id}
                      className="p-1.5 rounded-lg text-muted hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                    >
                      {deletingBlockId === block.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Block Modal */}
      <Modal
        open={showNewBlock}
        onClose={() => setShowNewBlock(false)}
        title="Nuovo Blocco Indisponibilità"
        size="sm"
      >
        <form onSubmit={handleCreateBlock} className="space-y-4">
          <Input
            id="blockDate"
            label="Data"
            type="date"
            value={newBlock.date}
            onChange={(e) => setNewBlock({ ...newBlock, date: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="blockStart"
              label="Ora inizio"
              type="time"
              value={newBlock.startTime}
              onChange={(e) => setNewBlock({ ...newBlock, startTime: e.target.value })}
              required
            />
            <Input
              id="blockEnd"
              label="Ora fine"
              type="time"
              value={newBlock.endTime}
              onChange={(e) => setNewBlock({ ...newBlock, endTime: e.target.value })}
              required
            />
          </div>
          <Input
            id="blockReason"
            label="Motivo (opzionale)"
            value={newBlock.reason}
            onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
            placeholder="Es. Visita medica, ferie..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowNewBlock(false)}>
              Annulla
            </Button>
            <Button type="submit" loading={creatingBlock}>
              Crea Blocco
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
