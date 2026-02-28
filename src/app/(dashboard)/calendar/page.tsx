'use client'

import { brandClient } from '@/lib/branding-client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { refreshAccessToken } from '@/hooks/useAuthRefresh'

import {
  CalendarHeader,
  SyncStatusBar,
  TeamSidebarDesktop,
  TeamPanelMobile,
  CalendarsPanelMobile,
  CalendarsSidebarDesktop,
  AgendaView,
  WeekView,
  DayView,
  MonthView,
  EventDetailModal,
  EventFormModal,
  NotConnectedState,
  MobileViewToggle,
  LoadingSkeleton,
} from '@/components/calendar'

import {
  TEAM_COLORS,
  CALENDAR_VIEWER_ROLES,
} from '@/components/calendar/constants'

import type {
  CalendarEvent,
  CalendarInfo,
  TeamMember,
  RecurrenceType,
  RecurrenceEndType,
  DesktopView,
  MobileView,
  NewEventData,
} from '@/components/calendar/types'

import {
  buildRruleString,
  getDaysInMonth,
  getFirstDayOfMonth,
  getEventDate,
  addHour,
  getWeekDates,
  getEventColor as getEventColorUtil,
} from '@/components/calendar/utils'

const LS_KEY = brandClient.storageKeys.calendarTeam
const LS_CALENDARS_KEY = brandClient.storageKeys.calendarSelected

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
  const [mobileView, setMobileView] = useState<MobileView>('day')
  const [desktopView, setDesktopView] = useState<DesktopView>('day')
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const [weekAnchor, setWeekAnchor] = useState(today.getDate())
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])
  const [attendeeSearch, setAttendeeSearch] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newEvent, setNewEvent] = useState<NewEventData>({
    summary: '', description: '', location: '',
    startDate: '', startTime: '', endDate: '', endTime: '', withMeet: false,
  })
  const [creating, setCreating] = useState(false)
  const [blockMode, setBlockMode] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none')
  const [recurrenceCustomDays, setRecurrenceCustomDays] = useState<number[]>([])
  const [recurrenceEndType, setRecurrenceEndType] = useState<RecurrenceEndType>('never')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [recurrenceEndCount, setRecurrenceEndCount] = useState(10)
  const [brandCalendarId, setBrandCalendarId] = useState<string | null>(null)
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set())
  const [targetCalendarId, setTargetCalendarId] = useState<string>('')
  const [userRole, setUserRole] = useState('')
  const [userId, setUserId] = useState('')
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [showTeamPanel, setShowTeamPanel] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'ok' | 'error' | 'scopes' | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [scopeError, setScopeError] = useState(false)

  const canViewTeam = CALENDAR_VIEWER_ROLES.includes(userRole)
  const isMultiUser = canViewTeam && selectedTeamIds.length > 0

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

  // --- Data fetching ---

  // eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
  const fetchCalendars = useCallback(async () => {
    try {
      let res = await fetch('/api/calendar')
      if (res.status === 401) {
        const refreshed = await refreshAccessToken()
        if (refreshed) res = await fetch('/api/calendar')
      }
      if (!res.ok) return
      const data = await res.json()
      if (data.calendars) {
        setCalendars(data.calendars)
        const brandCal = (data.calendars as CalendarInfo[]).find((c) =>
          c.summary.toLowerCase().includes(brandClient.slug)
        )
        if (brandCal) setBrandCalendarId(brandCal.id)

        const allCalIds = (data.calendars as CalendarInfo[]).map((c) => c.id)
        try {
          const saved = localStorage.getItem(LS_CALENDARS_KEY)
          if (saved) {
            const parsed = JSON.parse(saved) as string[]
            const valid = parsed.filter((id) => allCalIds.includes(id))
            setSelectedCalendars(new Set(valid.length > 0 ? valid : allCalIds))
          } else {
            setSelectedCalendars(new Set(allCalIds))
          }
        } catch {
          setSelectedCalendars(new Set(allCalIds))
        }

        const primaryCal = (data.calendars as CalendarInfo[]).find((c) => c.primary)
        setTargetCalendarId(primaryCal?.id || allCalIds[0] || '')
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

    const fetchWithRetry = async (url: string): Promise<Response> => {
      const res = await fetch(url)
      if (res.status === 401) {
        const refreshed = await refreshAccessToken()
        if (refreshed) return fetch(url)
      }
      return res
    }

    const processResponse = (res: Response, data: Record<string, unknown>): boolean => {
      if (!res.ok || data?.connected === false) {
        setConnected(false)
        if (data?.reason === 'scopes') { setScopeError(true); setSyncStatus('scopes') }
        return false
      }
      setConnected(true)
      setSyncStatus('ok')
      setLastSyncTime(new Date())
      setScopeError(false)
      setEvents((data.events as CalendarEvent[]) || [])
      return true
    }

    try {
      if (selectedTeamIds.length > 0 && canViewTeam) {
        const userIdsParam = selectedTeamIds.join(',')
        const res = await fetchWithRetry(`/api/calendar/events?${baseParams}&userIds=${userIdsParam}`)
        const data = await res.json()
        processResponse(res, data)
        return
      }

      if (selectedCalendars.size > 0) {
        const calIdsParam = [...selectedCalendars].map(encodeURIComponent).join(',')
        const res = await fetchWithRetry(`/api/calendar/events?${baseParams}&calendarIds=${calIdsParam}`)
        const data = await res.json()
        processResponse(res, data)
      } else {
        const res = await fetchWithRetry(`/api/calendar/events?${baseParams}`)
        const data = await res.json()
        processResponse(res, data)
      }
    } catch {
      setFetchError('Errore nel caricamento degli eventi')
      setSyncStatus('error')
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [year, month, selectedCalendars, selectedTeamIds, canViewTeam])

  // --- Effects ---

  useEffect(() => {
    const updateToday = () => {
      const now = new Date()
      setToday((prev) => {
        if (prev.toDateString() !== now.toDateString()) return now
        return prev
      })
    }
    const interval = setInterval(updateToday, 60_000)
    const onVisibility = () => { if (document.visibilityState === 'visible') updateToday() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisibility) }
  }, [])

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.user) {
          setUserRole(data.user.role)
          setUserId(data.user.id)
          try {
            const saved = localStorage.getItem(LS_KEY)
            if (saved) {
              const ids = JSON.parse(saved) as string[]
              if (Array.isArray(ids) && ids.length > 0) {
                const withSelf = ids.includes(data.user.id) ? ids : [data.user.id, ...ids]
                setSelectedTeamIds(withSelf)
              }
            }
          } catch { /* ignore */ }
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedTeamIds.length > 0) localStorage.setItem(LS_KEY, JSON.stringify(selectedTeamIds))
    else localStorage.removeItem(LS_KEY)
  }, [selectedTeamIds])

  useEffect(() => {
    if (selectedCalendars.size > 0) localStorage.setItem(LS_CALENDARS_KEY, JSON.stringify([...selectedCalendars]))
  }, [selectedCalendars])

  useEffect(() => {
    fetchCalendars()
    fetch('/api/team')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.items) setTeamMembers(data.items) })
      .catch(() => {})
  }, [fetchCalendars])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  useRealtimeRefresh('calendar', fetchEvents)

  // --- Handlers ---

  const openNewEventForDate = useCallback((dateStr: string) => {
    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setNewEvent({
      summary: '', description: '', location: '',
      startDate: dateStr, startTime: timeStr,
      endDate: dateStr, endTime: addHour(timeStr), withMeet: false,
    })
    setSelectedAttendees([])
    setAttendeeSearch('')
    setCreateError(null)
    setRecurrenceType('none')
    setRecurrenceCustomDays([])
    setRecurrenceEndType('never')
    setRecurrenceEndDate('')
    setRecurrenceEndCount(10)
    setShowNewEvent(true)
  }, [])

  const openEditEvent = useCallback((ev: CalendarEvent) => {
    const startDt = ev.start.dateTime || ev.start.date || ''
    const endDt = ev.end.dateTime || ev.end.date || ''
    const startDate = startDt.split('T')[0]
    const endDate = endDt.split('T')[0]
    const sTime = ev.start.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
    const eTime = ev.end.dateTime ? new Date(ev.end.dateTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''

    setNewEvent({
      summary: ev.summary || '', description: ev.description || '', location: ev.location || '',
      startDate, startTime: sTime, endDate, endTime: eTime, withMeet: false,
    })
    setSelectedAttendees(ev.attendees?.map((a) => a.email) || [])
    setAttendeeSearch('')
    setEditingEvent(ev)
    setCreateError(null)
    setRecurrenceType('none')
    setRecurrenceCustomDays([])
    setRecurrenceEndType('never')
    setRecurrenceEndDate('')
    setRecurrenceEndCount(10)
    if (ev._calendarId) setTargetCalendarId(ev._calendarId)
    setSelectedEvent(null)
    setShowNewEvent(true)
  }, [])

  // eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!blockMode && !newEvent.summary) return
    if (!newEvent.startDate || !newEvent.startTime) return
    setCreating(true)
    setCreateError(null)

    const effectiveEndDate = newEvent.endDate || newEvent.startDate
    const effectiveEndTime = newEvent.endTime || addHour(newEvent.startTime)

    if (blockMode && !editingEvent) {
      try {
        const start = `${newEvent.startDate}T${newEvent.startTime}:00`
        const end = `${effectiveEndDate}T${effectiveEndTime}:00`
        const recurrenceRules = buildRruleString(
          recurrenceType, newEvent.startDate, recurrenceCustomDays,
          recurrenceEndType, recurrenceEndDate, recurrenceEndCount,
        )
        const res = await fetch('/api/availability/block', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId, start, end,
            title: newEvent.summary || undefined,
            ...(recurrenceRules.length > 0 && { recurrence: recurrenceRules }),
            ...(targetCalendarId && { calendarId: targetCalendarId }),
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setCreateError(data.error || 'Errore nel blocco slot')
          return
        }
        setShowNewEvent(false)
        setBlockMode(false)
        setNewEvent({ summary: '', description: '', location: '', startDate: '', startTime: '', endDate: '', endTime: '', withMeet: false })
        fetchEvents()
        return
      } catch {
        setCreateError('Errore di rete. Riprova.')
        return
      } finally {
        setCreating(false)
      }
    }

    const start = `${newEvent.startDate}T${newEvent.startTime}:00`
    const end = `${effectiveEndDate}T${effectiveEndTime}:00`
    const attendeeEmails = selectedAttendees
    const recurrenceRules = buildRruleString(
      recurrenceType, newEvent.startDate, recurrenceCustomDays,
      recurrenceEndType, recurrenceEndDate, recurrenceEndCount,
    )

    try {
      if (editingEvent) {
        const res = await fetch(`/api/calendar/events/${editingEvent.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary: newEvent.summary, description: newEvent.description,
            location: newEvent.location, start, end,
            attendees: attendeeEmails,
            ...(targetCalendarId ? { calendarId: targetCalendarId } : brandCalendarId ? { calendarId: brandCalendarId } : {}),
            ...(recurrenceRules.length > 0 && { recurrence: recurrenceRules }),
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setCreateError(data.error || 'Errore nella modifica evento')
          return
        }
      } else {
        const res = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summary: newEvent.summary, description: newEvent.description,
            location: newEvent.location, start, end,
            withMeet: newEvent.withMeet || attendeeEmails.length > 0,
            attendees: attendeeEmails,
            ...(targetCalendarId ? { calendarId: targetCalendarId } : brandCalendarId ? { calendarId: brandCalendarId } : {}),
            ...(recurrenceRules.length > 0 && { recurrence: recurrenceRules }),
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
      const eventCalId = selectedEvent._calendarId || brandCalendarId
      const calParam = eventCalId ? `?calendarId=${encodeURIComponent(eventCalId)}` : ''
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

  // --- Derived state ---

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

  const getEventColor = useCallback((ev: CalendarEvent) => {
    return getEventColorUtil(ev, isMultiUser, teamColorMap, TEAM_COLORS[0])
  }, [isMultiUser, teamColorMap])

  const todayKey = today.toISOString().split('T')[0]
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const weekDates = useMemo(() => getWeekDates(year, month, weekAnchor), [year, month, weekAnchor])

  // --- Render ---

  if (connected === false) return <NotConnectedState />

  return (
    <div className="animate-fade-in">
      <CalendarHeader
        today={today}
        year={year}
        month={month}
        isCurrentMonth={isCurrentMonth}
        todayKey={todayKey}
        desktopView={desktopView}
        setDesktopView={setDesktopView}
        setSelectedDayKey={setSelectedDayKey}
        goToToday={goToToday}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
        openNewEventForDate={openNewEventForDate}
      />

      <SyncStatusBar
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        scopeError={scopeError}
        fetchError={fetchError}
        brandCalendarId={brandCalendarId}
        calendars={calendars}
        fetchEvents={fetchEvents}
      />

      <MobileViewToggle
        mobileView={mobileView}
        setMobileView={setMobileView}
        todayKey={todayKey}
        setSelectedDayKey={setSelectedDayKey}
        canViewTeam={canViewTeam}
        isMultiUser={isMultiUser}
        selectedTeamIds={selectedTeamIds}
        showTeamPanel={showTeamPanel}
        setShowTeamPanel={setShowTeamPanel}
      />

      {canViewTeam && showTeamPanel && (
        <TeamPanelMobile
          teamMembers={teamMembers}
          selectedTeamIds={selectedTeamIds}
          setSelectedTeamIds={setSelectedTeamIds}
          userId={userId}
          teamColorMap={teamColorMap}
        />
      )}

      {!canViewTeam && (
        <CalendarsPanelMobile
          calendars={calendars}
          selectedCalendars={selectedCalendars}
          setSelectedCalendars={setSelectedCalendars}
        />
      )}

      <div className="flex gap-4">
        {canViewTeam && (
          <TeamSidebarDesktop
            teamMembers={teamMembers}
            selectedTeamIds={selectedTeamIds}
            setSelectedTeamIds={setSelectedTeamIds}
            userId={userId}
            teamColorMap={teamColorMap}
            calendars={calendars}
            selectedCalendars={selectedCalendars}
            setSelectedCalendars={setSelectedCalendars}
          />
        )}

        {!canViewTeam && (
          <CalendarsSidebarDesktop
            calendars={calendars}
            selectedCalendars={selectedCalendars}
            setSelectedCalendars={setSelectedCalendars}
          />
        )}

        <div className="flex-1 min-w-0">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <>
              {mobileView === 'agenda' && (
                <AgendaView
                  eventsByDate={eventsByDate}
                  todayKey={todayKey}
                  isMultiUser={isMultiUser}
                  getEventColor={getEventColor}
                  setSelectedEvent={setSelectedEvent}
                  setSelectedDayKey={setSelectedDayKey}
                  setMobileView={setMobileView}
                />
              )}

              {desktopView === 'week' && (
                <WeekView
                  weekDates={weekDates}
                  todayKey={todayKey}
                  eventsByDate={eventsByDate}
                  getEventColor={getEventColor}
                  setSelectedEvent={setSelectedEvent}
                  setSelectedDayKey={setSelectedDayKey}
                  setDesktopView={setDesktopView}
                  setNewEvent={setNewEvent}
                  setCreateError={setCreateError}
                  setShowNewEvent={setShowNewEvent}
                />
              )}

              {(desktopView === 'day' || mobileView === 'day') && (
                <DayView
                  selectedDayKey={selectedDayKey}
                  setSelectedDayKey={setSelectedDayKey}
                  setYear={setYear}
                  setMonth={setMonth}
                  todayKey={todayKey}
                  eventsByDate={eventsByDate}
                  isMultiUser={isMultiUser}
                  getEventColor={getEventColor}
                  setSelectedEvent={setSelectedEvent}
                  openNewEventForDate={openNewEventForDate}
                  setNewEvent={setNewEvent}
                  setCreateError={setCreateError}
                  setShowNewEvent={setShowNewEvent}
                  mobileView={mobileView}
                />
              )}

              <MonthView
                year={year}
                month={month}
                daysInMonth={daysInMonth}
                firstDay={firstDay}
                totalCells={totalCells}
                todayKey={todayKey}
                eventsByDate={eventsByDate}
                desktopView={desktopView}
                mobileView={mobileView}
                getEventColor={getEventColor}
                setSelectedEvent={setSelectedEvent}
                setSelectedDayKey={setSelectedDayKey}
                setDesktopView={setDesktopView}
                setMobileView={setMobileView}
              />
            </>
          )}
        </div>
      </div>

      <EventDetailModal
        selectedEvent={selectedEvent}
        confirmDelete={confirmDelete}
        isMultiUser={isMultiUser}
        userId={userId}
        teamColorMap={teamColorMap}
        deleting={deleting}
        setSelectedEvent={setSelectedEvent}
        setConfirmDelete={setConfirmDelete}
        openEditEvent={openEditEvent}
        handleDeleteEvent={handleDeleteEvent}
      />

      <EventFormModal
        showNewEvent={showNewEvent}
        editingEvent={editingEvent}
        blockMode={blockMode}
        newEvent={newEvent}
        creating={creating}
        createError={createError}
        calendars={calendars}
        targetCalendarId={targetCalendarId}
        recurrenceType={recurrenceType}
        recurrenceCustomDays={recurrenceCustomDays}
        recurrenceEndType={recurrenceEndType}
        recurrenceEndDate={recurrenceEndDate}
        recurrenceEndCount={recurrenceEndCount}
        selectedAttendees={selectedAttendees}
        attendeeSearch={attendeeSearch}
        teamMembers={teamMembers}
        setShowNewEvent={setShowNewEvent}
        setEditingEvent={setEditingEvent}
        setBlockMode={setBlockMode}
        setNewEvent={setNewEvent}
        setTargetCalendarId={setTargetCalendarId}
        setRecurrenceType={setRecurrenceType}
        setRecurrenceCustomDays={setRecurrenceCustomDays}
        setRecurrenceEndType={setRecurrenceEndType}
        setRecurrenceEndDate={setRecurrenceEndDate}
        setRecurrenceEndCount={setRecurrenceEndCount}
        setSelectedAttendees={setSelectedAttendees}
        setAttendeeSearch={setAttendeeSearch}
        handleCreateEvent={handleCreateEvent}
      />
    </div>
  )
}
