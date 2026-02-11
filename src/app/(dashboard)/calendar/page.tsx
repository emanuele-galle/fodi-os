'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  ExternalLink,
  Link2Off,
  Video,
  Users,
  Calendar,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

interface CalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  htmlLink?: string
  attendees?: { email: string; responseStatus?: string }[]
  colorId?: string
  conferenceData?: {
    entryPoints?: { entryPointType: string; uri: string }[]
  }
}

interface CalendarInfo {
  id: string
  summary: string
  backgroundColor: string
  primary: boolean
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

function formatMonthYear(year: number, month: number) {
  return new Date(year, month).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
}

function formatTime(dateStr?: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function formatDateRange(start: CalendarEvent['start'], end: CalendarEvent['end']) {
  const startTime = formatTime(start.dateTime)
  const endTime = formatTime(end.dateTime)
  if (start.date) return 'Tutto il giorno'
  return `${startTime} - ${endTime}`
}

function getEventDate(event: CalendarEvent): string {
  const dt = event.start.dateTime || event.start.date || ''
  return dt.split('T')[0]
}

const EVENT_COLORS = [
  '#039BE5', '#7986CB', '#33B679', '#8E24AA', '#E67C73',
  '#F6BF26', '#F4511E', '#039BE5', '#616161', '#3F51B5',
  '#0B8043', '#D50000',
]

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  email: string
  avatarUrl: string | null
}

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [calendars, setCalendars] = useState<CalendarInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])
  const [attendeeSearch, setAttendeeSearch] = useState('')
  const [newEvent, setNewEvent] = useState({
    summary: '',
    description: '',
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    withMeet: false,
  })
  const [creating, setCreating] = useState(false)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const timeMin = new Date(year, month, 1).toISOString()
    const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

    try {
      const res = await fetch(`/api/calendar/events?timeMin=${timeMin}&timeMax=${timeMax}`)
      const data = await res.json()
      if (data.connected === false) {
        setConnected(false)
        return
      }
      setConnected(true)
      setEvents(data.events || [])
    } catch {
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  const fetchCalendars = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar')
      const data = await res.json()
      if (data.calendars) setCalendars(data.calendars)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchEvents()
    fetchCalendars()
    // Fetch team members for attendee selection
    fetch('/api/team')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.items) setTeamMembers(data.items)
      })
      .catch(() => {})
  }, [fetchEvents, fetchCalendars])

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEvent.summary || !newEvent.startDate || !newEvent.startTime) return
    setCreating(true)

    const start = `${newEvent.startDate}T${newEvent.startTime}:00`
    const end = newEvent.endDate && newEvent.endTime
      ? `${newEvent.endDate}T${newEvent.endTime}:00`
      : `${newEvent.startDate}T${newEvent.endTime || newEvent.startTime}:00`

    const attendeeEmails = selectedAttendees
      .map((id) => teamMembers.find((m) => m.id === id)?.email)
      .filter(Boolean) as string[]

    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: newEvent.summary,
          description: newEvent.description,
          location: newEvent.location,
          start,
          end,
          withMeet: newEvent.withMeet || attendeeEmails.length > 0,
          attendees: attendeeEmails,
        }),
      })

      if (res.ok) {
        setShowNewEvent(false)
        setNewEvent({ summary: '', description: '', location: '', startDate: '', startTime: '', endDate: '', endTime: '', withMeet: false })
        setSelectedAttendees([])
        setAttendeeSearch('')
        fetchEvents()
      }
    } finally {
      setCreating(false)
    }
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  const eventsByDate = new Map<string, CalendarEvent[]>()
  events.forEach((ev) => {
    const key = getEventDate(ev)
    if (!eventsByDate.has(key)) eventsByDate.set(key, [])
    eventsByDate.get(key)!.push(ev)
  })

  const todayKey = today.toISOString().split('T')[0]

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1) }
    else setMonth(month - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1) }
    else setMonth(month + 1)
  }

  // Not connected state
  if (connected === false) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--gold-gradient)' }}>
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Calendario</h1>
            <p className="text-sm text-muted">Visualizza e gestisci i tuoi eventi</p>
          </div>
        </div>
        <EmptyState
          icon={Link2Off}
          title="Google Calendar non connesso"
          description="Collega il tuo account Google per visualizzare e gestire i tuoi eventi direttamente da FODI OS."
          action={
            <Button onClick={() => window.location.href = '/api/auth/google'}>
              <img src="https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png" alt="" className="h-5 w-5 mr-2" />
              Connetti Google Calendar
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: 'var(--gold-gradient)' }}>
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Calendario</h1>
            <p className="text-sm text-muted">Visualizza e gestisci i tuoi eventi</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[130px] sm:min-w-[160px] text-center capitalize">
              {formatMonthYear(year, month)}
            </span>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" className="ml-auto sm:ml-0" onClick={() => {
            const d = new Date()
            const dateStr = d.toISOString().split('T')[0]
            const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
            setNewEvent(prev => ({ ...prev, startDate: dateStr, startTime: timeStr, endDate: dateStr, endTime: timeStr }))
            setShowNewEvent(true)
          }}>
            <Plus className="h-4 w-4 mr-1" />
            Nuovo Evento
          </Button>
        </div>
      </div>

      {/* Calendar legend */}
      {calendars.length > 1 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
          {calendars.map((cal) => (
            <div key={cal.id} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.backgroundColor }} />
              <span className="text-muted">{cal.summary}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <Skeleton className="h-[600px] w-full" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b border-border">
              {DAYS.map((day) => (
                <div key={day} className="py-2 text-center text-xs font-medium text-muted">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: totalCells }).map((_, i) => {
                const dayNum = i - firstDay + 1
                const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth
                const cellDate = isCurrentMonth
                  ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                  : null
                const isToday = cellDate === todayKey
                const dayEvents = cellDate ? eventsByDate.get(cellDate) || [] : []

                return (
                  <div
                    key={i}
                    className={`min-h-[60px] md:min-h-[100px] border-b border-r border-border p-1 md:p-1.5 ${
                      !isCurrentMonth ? 'bg-secondary/30' : ''
                    } ${isToday ? 'bg-primary/5' : ''}`}
                  >
                    {isCurrentMonth && (
                      <>
                        <div
                          className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                          }`}
                        >
                          {dayNum}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map((ev) => {
                            const colorIdx = ev.colorId ? parseInt(ev.colorId) - 1 : 0
                            const color = EVENT_COLORS[colorIdx] || EVENT_COLORS[0]
                            const isAllDay = !!ev.start.date

                            return (
                              <button
                                key={ev.id}
                                onClick={() => setSelectedEvent(ev)}
                                className="w-full text-left rounded px-1.5 py-0.5 text-[10px] truncate text-white transition-opacity hover:opacity-80"
                                style={{ backgroundColor: color }}
                                title={`${isAllDay ? '' : formatTime(ev.start.dateTime) + ' '}${ev.summary}`}
                              >
                                {!isAllDay && (
                                  <span className="font-medium mr-0.5">{formatTime(ev.start.dateTime)}</span>
                                )}
                                {ev.summary}
                              </button>
                            )
                          })}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-muted pl-1">
                              +{dayEvents.length - 3} altri
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event detail modal */}
      <Modal
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.summary || 'Evento'}
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Clock className="h-4 w-4" />
              <span>{formatDateRange(selectedEvent.start, selectedEvent.end)}</span>
            </div>

            {selectedEvent.location && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <MapPin className="h-4 w-4" />
                <span>{selectedEvent.location}</span>
              </div>
            )}

            {selectedEvent.description && (
              <p className="text-sm whitespace-pre-wrap">{selectedEvent.description}</p>
            )}

            {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Partecipanti</p>
                <div className="space-y-1">
                  {selectedEvent.attendees.map((a) => (
                    <div key={a.email} className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${
                        a.responseStatus === 'accepted' ? 'bg-green-500' :
                        a.responseStatus === 'declined' ? 'bg-red-500' :
                        'bg-amber-500'
                      }`} />
                      <span>{a.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedEvent.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video') && (
              <a
                href={selectedEvent.conferenceData.entryPoints.find(ep => ep.entryPointType === 'video')!.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-500/10 text-blue-600 text-sm font-medium hover:bg-blue-500/20 transition-colors"
              >
                <Video className="h-4 w-4" />
                Partecipa a Google Meet
              </a>
            )}

            {selectedEvent.htmlLink && (
              <a
                href={selectedEvent.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Apri in Google Calendar
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* New event modal */}
      <Modal open={showNewEvent} onClose={() => setShowNewEvent(false)} title="Nuovo Evento">
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <Input
            id="summary"
            label="Titolo"
            value={newEvent.summary}
            onChange={(e) => setNewEvent({ ...newEvent, summary: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="startDate"
              label="Data inizio"
              type="date"
              value={newEvent.startDate}
              onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
              required
            />
            <Input
              id="startTime"
              label="Ora inizio"
              type="time"
              value={newEvent.startTime}
              onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="endDate"
              label="Data fine"
              type="date"
              value={newEvent.endDate}
              onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
            />
            <Input
              id="endTime"
              label="Ora fine"
              type="time"
              value={newEvent.endTime}
              onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
            />
          </div>

          <Input
            id="location"
            label="Luogo"
            value={newEvent.location}
            onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
          />

          <div>
            <label htmlFor="desc" className="block text-sm font-medium mb-1">Descrizione</label>
            <textarea
              id="desc"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
            />
          </div>

          {/* Team members selection */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
              <Users className="h-4 w-4 text-muted" />
              Partecipanti
            </label>
            <input
              type="text"
              placeholder="Cerca membro del team..."
              value={attendeeSearch}
              onChange={(e) => setAttendeeSearch(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm mb-2 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {selectedAttendees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedAttendees.map((id) => {
                  const member = teamMembers.find((m) => m.id === id)
                  if (!member) return null
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedAttendees((prev) => prev.filter((a) => a !== id))}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Avatar src={member.avatarUrl} name={`${member.firstName} ${member.lastName}`} size="xs" />
                      {member.firstName} {member.lastName}
                      <span className="text-primary/60 ml-0.5">x</span>
                    </button>
                  )
                })}
              </div>
            )}
            <div className="max-h-32 overflow-y-auto border border-border/50 rounded-md">
              {teamMembers
                .filter((m) => {
                  if (selectedAttendees.includes(m.id)) return false
                  if (!attendeeSearch) return true
                  const query = attendeeSearch.toLowerCase()
                  return (
                    `${m.firstName} ${m.lastName}`.toLowerCase().includes(query) ||
                    m.email.toLowerCase().includes(query)
                  )
                })
                .slice(0, 8)
                .map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      setSelectedAttendees((prev) => [...prev, member.id])
                      setAttendeeSearch('')
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-secondary/50 transition-colors text-sm"
                  >
                    <Avatar src={member.avatarUrl} name={`${member.firstName} ${member.lastName}`} size="xs" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{member.firstName} {member.lastName}</p>
                      <p className="text-xs text-muted truncate">{member.email}</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newEvent.withMeet || selectedAttendees.length > 0}
              onChange={(e) => setNewEvent({ ...newEvent, withMeet: e.target.checked })}
              disabled={selectedAttendees.length > 0}
              className="rounded border-border"
            />
            <Video className="h-4 w-4 text-blue-500" />
            Aggiungi Google Meet
            {selectedAttendees.length > 0 && (
              <span className="text-xs text-muted">(automatico con partecipanti)</span>
            )}
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowNewEvent(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creazione...' : 'Crea Evento'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
