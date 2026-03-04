'use client'

import { useState, useCallback } from 'react'
import { buildRruleString, addHour } from '@/components/calendar/utils'
import type {
  CalendarEvent,
  NewEventData,
  RecurrenceType,
  RecurrenceEndType,
} from '@/components/calendar/types'

interface UseEventFormOptions {
  userId: string
  brandCalendarId: string | null
  targetCalendarId: string
  setTargetCalendarId: (id: string) => void
  fetchEvents: () => void
}

export function useEventForm({
  userId, brandCalendarId, targetCalendarId, setTargetCalendarId, fetchEvents,
}: UseEventFormOptions) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [newEvent, setNewEvent] = useState<NewEventData>({
    summary: '', description: '', location: '',
    startDate: '', startTime: '', endDate: '', endTime: '', withMeet: false,
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [blockMode, setBlockMode] = useState(false)
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])
  const [attendeeSearch, setAttendeeSearch] = useState('')
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none')
  const [recurrenceCustomDays, setRecurrenceCustomDays] = useState<number[]>([])
  const [recurrenceEndType, setRecurrenceEndType] = useState<RecurrenceEndType>('never')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [recurrenceEndCount, setRecurrenceEndCount] = useState(10)

  const resetForm = useCallback(() => {
    setNewEvent({ summary: '', description: '', location: '', startDate: '', startTime: '', endDate: '', endTime: '', withMeet: false })
    setSelectedAttendees([])
    setAttendeeSearch('')
    setCreateError(null)
    setRecurrenceType('none')
    setRecurrenceCustomDays([])
    setRecurrenceEndType('never')
    setRecurrenceEndDate('')
    setRecurrenceEndCount(10)
  }, [])

  const openNewEventForDate = useCallback((dateStr: string) => {
    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setNewEvent({
      summary: '', description: '', location: '',
      startDate: dateStr, startTime: timeStr,
      endDate: dateStr, endTime: addHour(timeStr), withMeet: false,
    })
    resetForm()
    setNewEvent(prev => ({ ...prev, startDate: dateStr, startTime: timeStr, endDate: dateStr, endTime: addHour(timeStr) }))
    setShowNewEvent(true)
  }, [resetForm])

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
  }, [setTargetCalendarId])

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
        resetForm()
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
      resetForm()
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

  const handleQuickCreate = useCallback(async (title: string, dateStr: string, hour: number) => {
    const startTime = `${String(hour).padStart(2, '0')}:00`
    const endTime = addHour(startTime)
    const start = `${dateStr}T${startTime}:00`
    const end = `${dateStr}T${endTime}:00`
    try {
      const calId = targetCalendarId || brandCalendarId
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: title, start, end,
          ...(calId ? { calendarId: calId } : {}),
        }),
      })
      if (res.ok) fetchEvents()
    } catch {
      // silent fail for quick create
    }
  }, [targetCalendarId, brandCalendarId, fetchEvents])

  return {
    selectedEvent, setSelectedEvent,
    showNewEvent, setShowNewEvent,
    editingEvent, setEditingEvent,
    newEvent, setNewEvent,
    creating, createError, setCreateError,
    deleting, confirmDelete, setConfirmDelete,
    blockMode, setBlockMode,
    selectedAttendees, setSelectedAttendees,
    attendeeSearch, setAttendeeSearch,
    recurrenceType, setRecurrenceType,
    recurrenceCustomDays, setRecurrenceCustomDays,
    recurrenceEndType, setRecurrenceEndType,
    recurrenceEndDate, setRecurrenceEndDate,
    recurrenceEndCount, setRecurrenceEndCount,
    openNewEventForDate, openEditEvent,
    handleCreateEvent, handleDeleteEvent, handleQuickCreate,
  }
}
