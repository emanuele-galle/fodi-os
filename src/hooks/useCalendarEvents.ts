'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { brandClient } from '@/lib/branding-client'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import { refreshAccessToken } from '@/hooks/useAuthRefresh'
import { formatLocalDateKey, getEventColor as getEventColorUtil } from '@/components/calendar/utils'
import { TEAM_COLORS } from '@/components/calendar/constants'
import type { CalendarEvent, CalendarInfo } from '@/components/calendar/types'

const LS_CALENDARS_KEY = brandClient.storageKeys.calendarSelected

interface UseCalendarEventsOptions {
  year: number
  month: number
  selectedTeamIds: string[]
  canViewTeam: boolean
  isMultiUser: boolean
  teamColorMap: Map<string, string>
}

export function useCalendarEvents({
  year, month, selectedTeamIds, canViewTeam, isMultiUser, teamColorMap,
}: UseCalendarEventsOptions) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [calendars, setCalendars] = useState<CalendarInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<'ok' | 'error' | 'scopes' | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [scopeError, setScopeError] = useState(false)
  const [brandCalendarId, setBrandCalendarId] = useState<string | null>(null)
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set())
  const [targetCalendarId, setTargetCalendarId] = useState<string>('')

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

  useEffect(() => { fetchCalendars() }, [fetchCalendars])
  useEffect(() => { fetchEvents() }, [fetchEvents])
  useEffect(() => {
    if (selectedCalendars.size > 0) localStorage.setItem(LS_CALENDARS_KEY, JSON.stringify([...selectedCalendars]))
  }, [selectedCalendars])

  useRealtimeRefresh('calendar', fetchEvents)

  // Derived: eventsByDate
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    events.forEach((ev) => {
      const startStr = ev.start.dateTime || ev.start.date || ''
      const endStr = ev.end.dateTime || ev.end.date || ''
      const startDate = new Date(startStr.split('T')[0] + 'T00:00:00')
      const endDate = new Date(endStr.split('T')[0] + 'T00:00:00')

      const isAllDay = !!ev.start.date
      if (isAllDay) endDate.setDate(endDate.getDate() - 1)

      if (!isAllDay && endStr.includes('T') && endStr.split('T')[1].startsWith('00:00')) {
        endDate.setDate(endDate.getDate() - 1)
      }

      const current = new Date(startDate)
      while (current <= endDate) {
        const key = formatLocalDateKey(current)
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(ev)
        current.setDate(current.getDate() + 1)
      }
    })
    return map
  }, [events])

  const getEventColor = useCallback((ev: CalendarEvent) => {
    return getEventColorUtil(ev, isMultiUser, teamColorMap, TEAM_COLORS[0])
  }, [isMultiUser, teamColorMap])

  return {
    events, calendars, loading, connected, fetchError,
    syncStatus, lastSyncTime, scopeError,
    brandCalendarId, selectedCalendars, setSelectedCalendars,
    targetCalendarId, setTargetCalendarId,
    eventsByDate, getEventColor, fetchEvents,
  }
}
