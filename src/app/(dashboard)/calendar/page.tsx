'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
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
  AlertCircle,
  Trash2,
  Pencil,
  CalendarDays,
  Check,
  X,
  Mail,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
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
  _ownerUserId?: string
  _ownerName?: string
}

interface CalendarInfo {
  id: string
  summary: string
  backgroundColor: string
  primary: boolean
}

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  email: string
  avatarUrl: string | null
  hasGoogleCalendar?: boolean
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8) // 8:00 - 20:00

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

function formatDateFull(dateStr?: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getEventDate(event: CalendarEvent): string {
  const dt = event.start.dateTime || event.start.date || ''
  return dt.split('T')[0]
}

function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const newH = Math.min(h + 1, 23)
  return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function getWeekDates(year: number, month: number, day: number): Date[] {
  const date = new Date(year, month, day)
  const dayOfWeek = date.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(date)
  monday.setDate(date.getDate() + mondayOffset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const EVENT_COLORS = [
  '#039BE5', '#7986CB', '#33B679', '#8E24AA', '#E67C73',
  '#F6BF26', '#F4511E', '#039BE5', '#616161', '#3F51B5',
  '#0B8043', '#D50000',
]

const TEAM_COLORS = [
  '#039BE5', // blue (utente corrente)
  '#E67C73', // red
  '#33B679', // green
  '#8E24AA', // purple
  '#F6BF26', // yellow
  '#F4511E', // orange
  '#7986CB', // indigo
  '#616161', // gray
]

const CALENDAR_VIEWER_ROLES = ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'PM']
const LS_KEY = 'fodi-calendar-team'

type DesktopView = 'month' | 'week'

export default function CalendarPage() {
  const [today, setToday] = useState(() => new Date())
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [calendars, setCalendars] = useState<CalendarInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [mobileView, setMobileView] = useState<'calendar' | 'agenda'>('agenda')
  const [desktopView, setDesktopView] = useState<DesktopView>('month')
  const [weekAnchor, setWeekAnchor] = useState(today.getDate())
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])
  const [attendeeSearch, setAttendeeSearch] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
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

  const [fodiCalendarId, setFodiCalendarId] = useState<string | null>(null)

  // Team calendar state
  const [userRole, setUserRole] = useState('')
  const [userId, setUserId] = useState('')
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [showTeamPanel, setShowTeamPanel] = useState(false)

  const canViewTeam = CALENDAR_VIEWER_ROLES.includes(userRole)
  const isMultiUser = canViewTeam && selectedTeamIds.length > 0

  // Map userId -> color for team members
  const teamColorMap = useMemo(() => {
    const map = new Map<string, string>()
    if (!userId) return map
    map.set(userId, TEAM_COLORS[0])
    let colorIdx = 1
    for (const m of teamMembers) {
      if (m.id === userId) continue
      if (!map.has(m.id)) {
        map.set(m.id, TEAM_COLORS[colorIdx % TEAM_COLORS.length])
        colorIdx++
      }
    }
    return map
  }, [userId, teamMembers])

  const fetchCalendars = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar')
      const data = await res.json()
      if (data.calendars) {
        setCalendars(data.calendars)
        // Find the "Fodi Srl" calendar (or similar name)
        const fodiCal = (data.calendars as CalendarInfo[]).find((c) =>
          c.summary.toLowerCase().includes('fodi')
        )
        if (fodiCal) {
          setFodiCalendarId(fodiCal.id)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    const timeMin = new Date(year, month, 1).toISOString()
    const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
    const baseParams = `timeMin=${timeMin}&timeMax=${timeMax}`

    try {
      // Multi-user mode: fetch all selected team members' events
      if (selectedTeamIds.length > 0 && canViewTeam) {
        const userIdsParam = selectedTeamIds.join(',')
        const calParam = fodiCalendarId ? `&calendarId=${encodeURIComponent(fodiCalendarId)}` : ''
        const res = await fetch(`/api/calendar/events?${baseParams}&userIds=${userIdsParam}${calParam}`)
        const data = await res.json()

        if (data?.connected === false) {
          setConnected(false)
          return
        }
        setConnected(true)
        setEvents(data.events || [])
        return
      }

      // Single-user mode (default)
      const primaryPromise = fetch(`/api/calendar/events?${baseParams}`)
        .then((r) => r.json())
        .catch(() => null)

      const sharedPromise = fodiCalendarId
        ? fetch(`/api/calendar/events?${baseParams}&calendarId=${encodeURIComponent(fodiCalendarId)}`)
            .then((r) => r.json())
            .catch(() => null)
        : Promise.resolve(null)

      const [primaryData, sharedData] = await Promise.all([primaryPromise, sharedPromise])

      if (primaryData?.connected === false) {
        setConnected(false)
        return
      }
      setConnected(true)

      const allEvents: CalendarEvent[] = []
      const seenIds = new Set<string>()
      for (const data of [sharedData, primaryData]) {
        if (!data?.events) continue
        for (const ev of data.events) {
          if (!seenIds.has(ev.id)) {
            seenIds.add(ev.id)
            allEvents.push(ev)
          }
        }
      }
      setEvents(allEvents)
    } catch {
      setFetchError('Errore nel caricamento degli eventi')
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [year, month, fodiCalendarId, selectedTeamIds, canViewTeam])

  // Keep today in sync (update at midnight or when tab regains focus)
  useEffect(() => {
    const updateToday = () => {
      const now = new Date()
      setToday((prev) => {
        if (prev.toDateString() !== now.toDateString()) return now
        return prev
      })
    }
    // Check every minute
    const interval = setInterval(updateToday, 60_000)
    // Also check on visibility change (tab focus)
    const onVisibility = () => { if (document.visibilityState === 'visible') updateToday() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisibility) }
  }, [])

  // Load user session for role check
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.user) {
          setUserRole(data.user.role)
          setUserId(data.user.id)
          // Restore team selection from localStorage
          try {
            const saved = localStorage.getItem(LS_KEY)
            if (saved) {
              const ids = JSON.parse(saved) as string[]
              if (Array.isArray(ids) && ids.length > 0) {
                // Always include current user
                const withSelf = ids.includes(data.user.id) ? ids : [data.user.id, ...ids]
                setSelectedTeamIds(withSelf)
              }
            }
          } catch { /* ignore */ }
        }
      })
      .catch(() => {})
  }, [])

  // Persist team selection
  useEffect(() => {
    if (selectedTeamIds.length > 0) {
      localStorage.setItem(LS_KEY, JSON.stringify(selectedTeamIds))
    } else {
      localStorage.removeItem(LS_KEY)
    }
  }, [selectedTeamIds])

  // Fetch calendars first, then events depend on fodiCalendarId
  useEffect(() => {
    fetchCalendars()
    fetch('/api/team')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.items) setTeamMembers(data.items)
      })
      .catch(() => {})
  }, [fetchCalendars])

  // Fetch events whenever month/year changes or fodiCalendarId is resolved
  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Real-time refresh when calendar data changes via SSE
  useRealtimeRefresh('calendar', fetchEvents)

  // Open new event modal with a precompiled date
  const openNewEventForDate = useCallback((dateStr: string) => {
    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setNewEvent({
      summary: '',
      description: '',
      location: '',
      startDate: dateStr,
      startTime: timeStr,
      endDate: dateStr,
      endTime: addHour(timeStr),
      withMeet: false,
    })
    setSelectedAttendees([])
    setAttendeeSearch('')
    setCreateError(null)
    setShowNewEvent(true)
  }, [])

  // Open edit modal
  const openEditEvent = useCallback((ev: CalendarEvent) => {
    const startDt = ev.start.dateTime || ev.start.date || ''
    const endDt = ev.end.dateTime || ev.end.date || ''
    const startDate = startDt.split('T')[0]
    const endDate = endDt.split('T')[0]
    const startTime = ev.start.dateTime ? formatTime(ev.start.dateTime).replace('.', ':') : ''
    const endTime = ev.end.dateTime ? formatTime(ev.end.dateTime).replace('.', ':') : ''

    // Extract HH:MM from dateTime
    const sTime = ev.start.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
    const eTime = ev.end.dateTime ? new Date(ev.end.dateTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''

    setNewEvent({
      summary: ev.summary || '',
      description: ev.description || '',
      location: ev.location || '',
      startDate,
      startTime: sTime,
      endDate,
      endTime: eTime,
      withMeet: false,
    })
    setSelectedAttendees(ev.attendees?.map((a) => a.email) || [])
    setAttendeeSearch('')
    setEditingEvent(ev)
    setCreateError(null)
    setSelectedEvent(null)
    setShowNewEvent(true)
  }, [])

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEvent.summary || !newEvent.startDate || !newEvent.startTime) return
    setCreating(true)
    setCreateError(null)

    const effectiveEndDate = newEvent.endDate || newEvent.startDate
    const effectiveEndTime = newEvent.endTime || addHour(newEvent.startTime)

    const start = `${newEvent.startDate}T${newEvent.startTime}:00`
    const end = `${effectiveEndDate}T${effectiveEndTime}:00`

    const attendeeEmails = selectedAttendees

    try {
      if (editingEvent) {
        // PATCH existing event
        const res = await fetch(`/api/calendar/events/${editingEvent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary: newEvent.summary,
            description: newEvent.description,
            location: newEvent.location,
            start,
            end,
            attendees: attendeeEmails,
            ...(fodiCalendarId && { calendarId: fodiCalendarId }),
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setCreateError(data.error || 'Errore nella modifica evento')
          return
        }
      } else {
        // POST new event
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
            ...(fodiCalendarId && { calendarId: fodiCalendarId }),
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setCreateError(data.error || data.details ? JSON.stringify(data.details) : 'Errore nella creazione evento')
          return
        }
      }

      setShowNewEvent(false)
      setEditingEvent(null)
      setNewEvent({ summary: '', description: '', location: '', startDate: '', startTime: '', endDate: '', endTime: '', withMeet: false })
      setSelectedAttendees([])
      setAttendeeSearch('')
      fetchEvents()
    } catch {
      setCreateError('Errore di rete. Riprova.')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return
    setDeleting(true)
    try {
      const calParam = fodiCalendarId ? `?calendarId=${encodeURIComponent(fodiCalendarId)}` : ''
      const res = await fetch(`/api/calendar/events/${selectedEvent.id}${calParam}`, { method: 'DELETE' })
      if (res.ok) {
        setSelectedEvent(null)
        setConfirmDelete(false)
        fetchEvents()
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false)
    }
  }

  const goToToday = useCallback(() => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setWeekAnchor(today.getDate())
  }, [today])

  const prevMonth = useCallback(() => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }, [month])

  const nextMonth = useCallback(() => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }, [month])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    events.forEach((ev) => {
      const key = getEventDate(ev)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    })
    return map
  }, [events])

  // Get event color: use team color if multi-user, otherwise use Google colorId
  const getEventColor = useCallback((ev: CalendarEvent) => {
    if (isMultiUser && ev._ownerUserId) {
      return teamColorMap.get(ev._ownerUserId) || TEAM_COLORS[0]
    }
    const colorIdx = ev.colorId ? parseInt(ev.colorId) - 1 : 0
    return EVENT_COLORS[colorIdx] || EVENT_COLORS[0]
  }, [isMultiUser, teamColorMap])

  const todayKey = today.toISOString().split('T')[0]
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  const weekDates = useMemo(() => getWeekDates(year, month, weekAnchor), [year, month, weekAnchor])

  // Not connected state
  if (connected === false) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Calendario</h1>
            <p className="text-sm text-muted">Visualizza e gestisci i tuoi eventi</p>
          </div>
        </div>
        <EmptyState
          icon={Link2Off}
          title="Google Calendar non connesso"
          description="Collega il tuo account Google per visualizzare e gestire i tuoi eventi direttamente da FODI OS. Assicurati di accettare tutti i permessi richiesti (Calendario, Drive, Meet)."
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Calendario</h1>
            <p className="text-sm text-muted">
              {today.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Today button */}
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className={isCurrentMonth ? 'opacity-50' : ''}
          >
            <CalendarDays className="h-4 w-4 mr-1" />
            Oggi
          </Button>

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

          {/* Desktop view toggle */}
          <div className="hidden md:flex items-center rounded-lg border border-border bg-secondary/30 p-0.5">
            <button
              onClick={() => setDesktopView('month')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                desktopView === 'month' ? 'bg-card shadow-sm text-foreground' : 'text-muted hover:text-foreground'
              }`}
            >
              Mese
            </button>
            <button
              onClick={() => setDesktopView('week')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                desktopView === 'week' ? 'bg-card shadow-sm text-foreground' : 'text-muted hover:text-foreground'
              }`}
            >
              Settimana
            </button>
          </div>

          <Button size="sm" className="ml-auto sm:ml-0" onClick={() => openNewEventForDate(todayKey)}>
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Nuovo Evento</span>
            <span className="sm:hidden">Nuovo</span>
          </Button>
        </div>
      </div>

      {/* Active calendar indicator */}
      {fodiCalendarId && calendars.length > 0 && (() => {
        const activeCal = calendars.find((c) => c.id === fodiCalendarId)
        return activeCal ? (
          <div className="flex items-center gap-2 mb-4 text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeCal.backgroundColor }} />
            <span className="text-muted font-medium">{activeCal.summary}</span>
          </div>
        ) : null
      })()}

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchEvents()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* Mobile: Team button + view toggle */}
      <div className="md:hidden flex items-center gap-2 mb-4">
        {canViewTeam && (
          <button
            onClick={() => setShowTeamPanel(!showTeamPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
              isMultiUser
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border bg-secondary/30 text-muted'
            }`}
          >
            <Users className="h-4 w-4" />
            Team
            {isMultiUser && selectedTeamIds.length > 1 && (
              <span className="ml-0.5 text-xs bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                {selectedTeamIds.length}
              </span>
            )}
          </button>
        )}
        <div className="flex-1 flex rounded-lg border border-border bg-secondary/30 p-1">
        <button
          onClick={() => setMobileView('agenda')}
          className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${
            mobileView === 'agenda' ? 'bg-card shadow-sm text-foreground' : 'text-muted'
          }`}
        >
          Agenda
        </button>
        <button
          onClick={() => setMobileView('calendar')}
          className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${
            mobileView === 'calendar' ? 'bg-card shadow-sm text-foreground' : 'text-muted'
          }`}
        >
          Mese
        </button>
        </div>
      </div>

      {/* Mobile team panel dropdown */}
      {canViewTeam && showTeamPanel && (
        <div className="md:hidden mb-4 p-3 rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Calendari Team</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const allIds = teamMembers.filter((m) => m.hasGoogleCalendar).map((m) => m.id)
                  setSelectedTeamIds(allIds)
                }}
                className="text-xs text-primary hover:underline"
              >
                Tutti
              </button>
              <button
                onClick={() => setSelectedTeamIds(userId ? [userId] : [])}
                className="text-xs text-muted hover:underline"
              >
                Solo io
              </button>
            </div>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {teamMembers
              .filter((m) => m.hasGoogleCalendar)
              .map((m) => {
                const isSelected = selectedTeamIds.includes(m.id)
                const isSelf = m.id === userId
                const color = teamColorMap.get(m.id) || TEAM_COLORS[0]
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (isSelf) return
                      setSelectedTeamIds((prev) =>
                        isSelected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                      )
                    }}
                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors ${
                      isSelected ? 'bg-secondary/50' : 'hover:bg-secondary/30'
                    } ${isSelf ? 'opacity-70 cursor-default' : ''}`}
                  >
                    <div
                      className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center ${
                        isSelected ? '' : 'border-border'
                      }`}
                      style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                    >
                      {isSelected && <Check className="h-2 w-2 text-white" />}
                    </div>
                    <Avatar src={m.avatarUrl} name={`${m.firstName} ${m.lastName}`} size="xs" />
                    <span className="text-sm truncate">{m.firstName} {m.lastName}</span>
                    {isSelf && <span className="text-xs text-muted ml-auto">(tu)</span>}
                  </button>
                )
              })}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {/* Desktop team sidebar */}
        {canViewTeam && (
          <div className="hidden md:block w-52 flex-shrink-0">
            <Card className="sticky top-4">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-muted" />
                    Calendari Team
                  </p>
                </div>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => {
                      const allIds = teamMembers.filter((m) => m.hasGoogleCalendar).map((m) => m.id)
                      setSelectedTeamIds(allIds)
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Tutti
                  </button>
                  <button
                    onClick={() => setSelectedTeamIds(userId ? [userId] : [])}
                    className="text-xs text-muted hover:underline"
                  >
                    Solo io
                  </button>
                </div>
                <div className="space-y-0.5">
                  {teamMembers
                    .filter((m) => m.hasGoogleCalendar)
                    .map((m) => {
                      const isSelected = selectedTeamIds.includes(m.id)
                      const isSelf = m.id === userId
                      const color = teamColorMap.get(m.id) || TEAM_COLORS[0]
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            if (isSelf) return
                            setSelectedTeamIds((prev) =>
                              isSelected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                            )
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                            isSelected ? 'bg-secondary/50' : 'hover:bg-secondary/30'
                          } ${isSelf ? 'opacity-70 cursor-default' : ''}`}
                        >
                          <div
                            className={`w-3 h-3 rounded-sm border-2 flex-shrink-0 flex items-center justify-center ${
                              isSelected ? '' : 'border-border'
                            }`}
                            style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                          >
                            {isSelected && <Check className="h-2 w-2 text-white" />}
                          </div>
                          <Avatar src={m.avatarUrl} name={`${m.firstName} ${m.lastName}`} size="xs" />
                          <span className="text-xs truncate">{m.firstName} {m.lastName}</span>
                        </button>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Calendar content */}
        <div className="flex-1 min-w-0">
      {loading ? (
        <div className="space-y-1">
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((d) => (
              <div key={d} className="h-8 rounded bg-secondary/40 animate-pulse" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, row) => (
            <div key={row} className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, col) => (
                <div key={col} className="h-16 md:h-24 rounded bg-secondary/30 animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Mobile Agenda View */}
          {mobileView === 'agenda' && (
            <div className="md:hidden space-y-2">
              {(() => {
                const sortedDates = Array.from(eventsByDate.keys()).sort()
                if (sortedDates.length === 0) {
                  return (
                    <EmptyState
                      icon={Calendar}
                      title="Nessun evento"
                      description="Non ci sono eventi questo mese. Tocca + per crearne uno."
                    />
                  )
                }
                return sortedDates.map((dateKey) => {
                  const dayEvents = eventsByDate.get(dateKey) || []
                  const d = new Date(dateKey + 'T00:00:00')
                  const isToday = dateKey === todayKey
                  return (
                    <div key={dateKey}>
                      <div className={`sticky top-0 z-10 px-3 py-1.5 text-xs font-semibold rounded-md mb-1 ${
                        isToday ? 'bg-primary/10 text-primary' : 'bg-secondary/50 text-muted'
                      }`}>
                        {isToday && 'Oggi - '}
                        {d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </div>
                      <div className="space-y-1.5 mb-3">
                        {dayEvents.map((ev) => {
                          const color = getEventColor(ev)
                          const isAllDay = !!ev.start.date
                          return (
                            <button
                              key={ev.id}
                              onClick={() => setSelectedEvent(ev)}
                              className="w-full text-left rounded-xl border border-border/60 bg-card p-3 flex items-center gap-3 active:bg-secondary/30 transition-all touch-manipulation shadow-sm hover:shadow-md"
                            >
                              <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{ev.summary}</p>
                                <p className="text-xs text-muted mt-0.5">
                                  {isAllDay ? 'Tutto il giorno' : formatDateRange(ev.start, ev.end)}
                                </p>
                                {isMultiUser && ev._ownerName && (
                                  <p className="text-xs mt-0.5 font-medium" style={{ color }}>
                                    {ev._ownerName}
                                  </p>
                                )}
                                {ev.location && (
                                  <p className="text-xs text-muted truncate mt-0.5">
                                    <MapPin className="inline h-3 w-3 mr-0.5" />{ev.location}
                                  </p>
                                )}
                              </div>
                              {ev.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video') && (
                                <Video className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}

          {/* Desktop Week View */}
          {desktopView === 'week' && (
            <Card className="hidden md:block overflow-hidden">
              <CardContent className="p-0">
                {/* Week header */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
                  <div className="py-2" />
                  {weekDates.map((d, i) => {
                    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                    const isToday = dateKey === todayKey
                    return (
                      <button
                        key={i}
                        onClick={() => openNewEventForDate(dateKey)}
                        className={`py-2 text-center border-l border-border hover:bg-secondary/30 transition-colors ${
                          isToday ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="text-xs text-muted">{DAYS[i]}</div>
                        <div className={`text-sm font-semibold mt-0.5 ${
                          isToday ? 'text-primary' : ''
                        }`}>
                          {d.getDate()}
                        </div>
                      </button>
                    )
                  })}
                </div>
                {/* Hour rows */}
                <div className="max-h-[600px] overflow-y-auto">
                  {HOURS.map((hour) => (
                    <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50 min-h-[48px]">
                      <div className="text-xs text-muted py-1 px-2 text-right">
                        {String(hour).padStart(2, '0')}:00
                      </div>
                      {weekDates.map((d, i) => {
                        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                        const dayEvents = eventsByDate.get(dateKey) || []
                        const hourEvents = dayEvents.filter((ev) => {
                          if (ev.start.date) return hour === 8 // Show all-day events at 8am
                          const evHour = ev.start.dateTime ? new Date(ev.start.dateTime).getHours() : -1
                          return evHour === hour
                        })
                        return (
                          <div
                            key={i}
                            className="border-l border-border/50 px-0.5 py-0.5 hover:bg-secondary/20 transition-colors cursor-pointer"
                            onClick={() => {
                              const dateStr = dateKey
                              const timeStr = `${String(hour).padStart(2, '0')}:00`
                              setNewEvent({
                                summary: '', description: '', location: '',
                                startDate: dateStr, startTime: timeStr,
                                endDate: dateStr, endTime: addHour(timeStr),
                                withMeet: false,
                              })
                              setCreateError(null)
                              setShowNewEvent(true)
                            }}
                          >
                            {hourEvents.map((ev) => {
                              const color = getEventColor(ev)
                              return (
                                <button
                                  key={ev.id}
                                  onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev) }}
                                  className="w-full text-left rounded px-1.5 py-0.5 text-[10px] truncate border-l-2 bg-opacity-10 hover:bg-opacity-20 transition-colors mb-0.5"
                                  style={{ borderLeftColor: color, backgroundColor: color + '20', color: color }}
                                >
                                  <span className="font-semibold">{ev.start.date ? 'Giornata' : formatTime(ev.start.dateTime)}</span>{' '}
                                  {ev.summary}
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Calendar Month Grid - always on desktop (if month view), conditional on mobile */}
          {(desktopView === 'month' || mobileView === 'calendar') && (
            <Card className={`overflow-hidden ${mobileView === 'calendar' ? '' : 'hidden md:block'}`}>
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
                        onClick={() => {
                          if (isCurrentMonth && cellDate) {
                            openNewEventForDate(cellDate)
                          }
                        }}
                        className={`min-h-[60px] md:min-h-[100px] border-b border-r border-border/60 p-1 md:p-1.5 transition-colors cursor-pointer ${
                          !isCurrentMonth ? 'bg-secondary/20' : 'hover:bg-secondary/20'
                        } ${isToday ? 'bg-primary/5 hover:bg-primary/10' : ''}`}
                      >
                        {isCurrentMonth && (
                          <>
                            <div
                              className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                                isToday
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-foreground hover:bg-secondary'
                              }`}
                            >
                              {dayNum}
                            </div>
                            {/* Mobile: show dots only */}
                            <div className="md:hidden flex gap-0.5 flex-wrap">
                              {dayEvents.slice(0, 4).map((ev) => {
                                const color = getEventColor(ev)
                                return (
                                  <div
                                    key={ev.id}
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: color }}
                                  />
                                )
                              })}
                            </div>
                            {/* Desktop: event pills with border-left style */}
                            <div className="hidden md:block space-y-0.5">
                              {dayEvents.slice(0, 3).map((ev) => {
                                const color = getEventColor(ev)
                                const isAllDay = !!ev.start.date

                                return (
                                  <button
                                    key={ev.id}
                                    onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev) }}
                                    className="w-full text-left rounded-md px-1.5 py-0.5 text-[10px] truncate border-l-2 transition-all hover:shadow-sm"
                                    style={{
                                      borderLeftColor: color,
                                      backgroundColor: color + '15',
                                      color: 'inherit',
                                    }}
                                    title={`${isAllDay ? '' : formatTime(ev.start.dateTime) + ' '}${ev.summary}${ev._ownerName ? ` (${ev._ownerName})` : ''}`}
                                  >
                                    {!isAllDay && (
                                      <span className="font-semibold mr-0.5" style={{ color }}>{formatTime(ev.start.dateTime)}</span>
                                    )}
                                    {ev.summary}
                                  </button>
                                )
                              })}
                              {dayEvents.length > 3 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (dayEvents[3]) setSelectedEvent(dayEvents[3])
                                  }}
                                  className="text-[10px] text-muted pl-1 hover:text-foreground transition-colors"
                                >
                                  +{dayEvents.length - 3} altri
                                </button>
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
        </>
      )}
      </div>{/* end calendar content */}
      </div>{/* end flex sidebar+content */}

      {/* Event detail modal */}
      <Modal
        open={!!selectedEvent && !confirmDelete}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.summary || 'Evento'}
      >
        {selectedEvent && (
          <div className="space-y-4">
            {/* Owner indicator (multi-user mode) */}
            {isMultiUser && selectedEvent._ownerName && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/30">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: teamColorMap.get(selectedEvent._ownerUserId || '') || TEAM_COLORS[0] }}
                />
                <span className="text-sm font-medium">Calendario di {selectedEvent._ownerName}</span>
              </div>
            )}

            {/* Date/time with icon */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
              <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  {formatDateFull(selectedEvent.start.dateTime || selectedEvent.start.date)}
                </p>
                <p className="text-sm text-muted">
                  {formatDateRange(selectedEvent.start, selectedEvent.end)}
                </p>
              </div>
            </div>

            {selectedEvent.location && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                <MapPin className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm">{selectedEvent.location}</span>
              </div>
            )}

            {selectedEvent.description && (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedEvent.description}</p>
            )}

            {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted" />
                  Partecipanti ({selectedEvent.attendees.length})
                </p>
                <div className="space-y-1.5">
                  {selectedEvent.attendees.map((a) => (
                    <div key={a.email} className="flex items-center gap-2 text-sm">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        a.responseStatus === 'accepted' ? 'bg-emerald-100 text-emerald-600' :
                        a.responseStatus === 'declined' ? 'bg-red-100 text-red-600' :
                        'bg-amber-100 text-amber-600'
                      }`}>
                        {a.responseStatus === 'accepted' ? <Check className="h-3 w-3" /> :
                         a.responseStatus === 'declined' ? <X className="h-3 w-3" /> :
                         <Clock className="h-3 w-3" />}
                      </div>
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
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-600 text-sm font-medium hover:bg-indigo-500/20 transition-colors"
              >
                <Video className="h-4 w-4" />
                Partecipa a Google Meet
              </a>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              {selectedEvent.htmlLink && (
                <a
                  href={selectedEvent.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Google Calendar
                </a>
              )}
              <div className="flex-1" />
              {(!selectedEvent._ownerUserId || selectedEvent._ownerUserId === userId) && (
                <>
                  <Button variant="outline" size="sm" onClick={() => openEditEvent(selectedEvent)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Modifica
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                Elimina
              </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm delete modal */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Elimina evento"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Sei sicuro di voler eliminare <strong>{selectedEvent?.summary}</strong>? Questa azione non può essere annullata.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
              Annulla
            </Button>
            <Button variant="destructive" size="sm" loading={deleting} onClick={handleDeleteEvent}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Elimina
            </Button>
          </div>
        </div>
      </Modal>

      {/* New/Edit event modal */}
      <Modal
        open={showNewEvent}
        onClose={() => { setShowNewEvent(false); setEditingEvent(null) }}
        title={editingEvent ? 'Modifica Evento' : 'Nuovo Evento'}
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          {createError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{createError}</p>
            </div>
          )}

          <Input
            id="summary"
            label="Titolo"
            value={newEvent.summary}
            onChange={(e) => setNewEvent({ ...newEvent, summary: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              onChange={(e) => {
                const updated: typeof newEvent = { ...newEvent, startTime: e.target.value }
                // Auto-fill end time if empty
                if (!newEvent.endTime) {
                  updated.endTime = addHour(e.target.value)
                }
                setNewEvent(updated)
              }}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="endDate"
              label="Data fine"
              type="date"
              value={newEvent.endDate}
              onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
              placeholder={newEvent.startDate}
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
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
            />
          </div>

          {/* Participants selection - team members + external emails */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
              <Users className="h-4 w-4 text-muted" />
              Partecipanti
            </label>
            <input
              type="text"
              placeholder="Cerca membro del team o inserisci email..."
              value={attendeeSearch}
              onChange={(e) => setAttendeeSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const val = attendeeSearch.trim()
                  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) && !selectedAttendees.includes(val)) {
                    setSelectedAttendees((prev) => [...prev, val])
                    setAttendeeSearch('')
                  }
                }
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mb-2 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
            />
            {selectedAttendees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedAttendees.map((email) => {
                  const member = teamMembers.find((m) => m.email === email)
                  return (
                    <button
                      key={email}
                      type="button"
                      onClick={() => setSelectedAttendees((prev) => prev.filter((a) => a !== email))}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      {member ? (
                        <Avatar src={member.avatarUrl} name={`${member.firstName} ${member.lastName}`} size="xs" />
                      ) : (
                        <Mail className="h-3 w-3" />
                      )}
                      {member ? `${member.firstName} ${member.lastName}` : email}
                      <span className="text-primary/60 ml-0.5">x</span>
                    </button>
                  )
                })}
              </div>
            )}
            <div className="max-h-32 overflow-y-auto border border-border/50 rounded-lg">
              {teamMembers
                .filter((m) => {
                  if (selectedAttendees.includes(m.email)) return false
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
                      setSelectedAttendees((prev) => [...prev, member.email])
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
              {/* Show "Invite external email" option */}
              {attendeeSearch.trim() &&
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendeeSearch.trim()) &&
                !selectedAttendees.includes(attendeeSearch.trim()) &&
                !teamMembers.some((m) => m.email === attendeeSearch.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAttendees((prev) => [...prev, attendeeSearch.trim()])
                    setAttendeeSearch('')
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-secondary/50 transition-colors text-sm border-t border-border/50"
                >
                  <Mail className="h-4 w-4 text-primary" />
                  <div className="min-w-0">
                    <p className="font-medium text-primary">Invita {attendeeSearch.trim()}</p>
                    <p className="text-xs text-muted">Partecipante esterno</p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Meet toggle */}
          {!editingEvent && (
            <label className="flex items-center gap-3 text-sm p-3 rounded-lg bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={newEvent.withMeet || selectedAttendees.length > 0}
                  onChange={(e) => setNewEvent({ ...newEvent, withMeet: e.target.checked })}
                  disabled={selectedAttendees.length > 0}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-border rounded-full peer-checked:bg-indigo-500 transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
              </div>
              <Video className="h-4 w-4 text-indigo-500" />
              <span>Aggiungi Google Meet</span>
              {selectedAttendees.length > 0 && (
                <span className="text-xs text-muted">(automatico con partecipanti)</span>
              )}
            </label>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setShowNewEvent(false); setEditingEvent(null) }}>
              Annulla
            </Button>
            <Button type="submit" loading={creating}>
              {editingEvent ? 'Salva Modifiche' : 'Crea Evento'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
