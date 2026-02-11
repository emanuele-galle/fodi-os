'use client'

import { useState, useEffect, useCallback } from 'react'

interface UserPreferences {
  theme: 'light' | 'dark' | 'midnight'
  sidebarCollapsed: boolean
  defaultView: 'list' | 'kanban'
}

const STORAGE_KEY = 'fodi-user-preferences'

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  sidebarCollapsed: false,
  defaultView: 'list',
}

function loadPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) }
    }
  } catch {}
  return DEFAULT_PREFERENCES
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setPreferences(loadPreferences())
    setLoaded(true)
  }, [])

  const updatePreference = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: value }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

      // Fire and forget API sync
      fetch('/api/auth/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      }).catch(() => {})

      return updated
    })
  }, [])

  return { preferences, updatePreference, loaded }
}
