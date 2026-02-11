'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Hook that proactively refreshes the access token before it expires.
 * Runs a silent refresh every 12 minutes (token expires at 15min).
 * Also handles 401 responses by attempting refresh before redirecting to login.
 */
export function useAuthRefresh() {
  const router = useRouter()
  const refreshing = useRef(false)

  const doRefresh = useCallback(async (): Promise<boolean> => {
    if (refreshing.current) return true
    refreshing.current = true

    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' })
      if (res.ok) {
        return true
      }
      // Refresh failed - session truly expired
      router.push('/login')
      return false
    } catch {
      return false
    } finally {
      refreshing.current = false
    }
  }, [router])

  useEffect(() => {
    // Proactive refresh: every 12 minutes (token lives 15min)
    const interval = setInterval(() => {
      doRefresh()
    }, 12 * 60 * 1000)

    // Also refresh on tab focus (user returns after being away)
    function onFocus() {
      doRefresh()
    }
    window.addEventListener('focus', onFocus)

    // Initial refresh to ensure token is valid on mount
    doRefresh()

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [doRefresh])

  return { refresh: doRefresh }
}
