'use client'

import { useState, useEffect, useMemo } from 'react'
import { brandClient } from '@/lib/branding-client'
import { TEAM_COLORS, CALENDAR_VIEWER_ROLES } from '@/components/calendar/constants'
import type { TeamMember } from '@/components/calendar/types'

const LS_KEY = brandClient.storageKeys.calendarTeam

export function useCalendarTeam() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [userRole, setUserRole] = useState('')
  const [userId, setUserId] = useState('')
  const [showTeamPanel, setShowTeamPanel] = useState(false)

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

  // Load session + team members
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

    fetch('/api/team')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.items) setTeamMembers(data.items) })
      .catch(() => {})
  }, [])

  // Persist selection
  useEffect(() => {
    if (selectedTeamIds.length > 0) localStorage.setItem(LS_KEY, JSON.stringify(selectedTeamIds))
    else localStorage.removeItem(LS_KEY)
  }, [selectedTeamIds])

  return {
    teamMembers, selectedTeamIds, setSelectedTeamIds,
    userRole, userId, canViewTeam, isMultiUser,
    teamColorMap, showTeamPanel, setShowTeamPanel,
  }
}
