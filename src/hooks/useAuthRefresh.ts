'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Hook that proactively refreshes the access token before it expires.
 * Uses a global lock to prevent concurrent refresh attempts from multiple
 * components or polling intervals (which would trigger token reuse detection
 * and revoke ALL tokens, causing unexpected logout).
 *
 * Access token: 15min. Proactive refresh: every 12min.
 * On tab focus: refresh only if >10min since last successful refresh.
 */

// Global state shared across all hook instances (singleton)
let lastRefreshTime = 0
let globalRefreshing = false

export function useAuthRefresh() {
  const router = useRouter()
  const mountedRef = useRef(true)

  const doRefresh = useCallback(async (force = false): Promise<boolean> => {
    // Skip if another refresh is in progress
    if (globalRefreshing) return true

    // Skip if refreshed recently (< 2 minutes ago) unless forced
    const elapsed = Date.now() - lastRefreshTime
    if (!force && elapsed < 2 * 60 * 1000) return true

    globalRefreshing = true

    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' })
      if (res.ok) {
        lastRefreshTime = Date.now()
        return true
      }
      // Refresh failed - session truly expired
      if (mountedRef.current) {
        router.push('/login')
      }
      return false
    } catch {
      return false
    } finally {
      globalRefreshing = false
    }
  }, [router])

  useEffect(() => {
    mountedRef.current = true

    // Proactive refresh: every 25 minutes (token lives 30min)
    const interval = setInterval(() => {
      doRefresh()
    }, 25 * 60 * 1000)

    // On tab focus: refresh only if it's been a while (>20 minutes)
    function onFocus() {
      const elapsed = Date.now() - lastRefreshTime
      if (elapsed > 20 * 60 * 1000) {
        doRefresh()
      }
    }
    window.addEventListener('focus', onFocus)

    // Initial refresh only if we haven't refreshed recently
    if (Date.now() - lastRefreshTime > 2 * 60 * 1000) {
      doRefresh()
    }

    return () => {
      mountedRef.current = false
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [doRefresh])

  return { refresh: doRefresh }
}
