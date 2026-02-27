'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Hook that proactively refreshes the access token before it expires.
 * Uses a global lock to prevent concurrent refresh attempts from multiple
 * components or polling intervals (which would trigger token reuse detection
 * and revoke ALL tokens, causing unexpected logout).
 *
 * Access token: 7d. Proactive refresh: every 6h.
 * On tab focus: refresh if last refresh was more than 1h ago.
 */

// Global state shared across all hook instances (singleton)
let lastRefreshTime = 0
let refreshPromise: Promise<boolean> | null = null

export function useAuthRefresh() {
  const router = useRouter()
  const mountedRef = useRef(true)

  const doRefresh = useCallback(async (force = false): Promise<boolean> => {
    // If a refresh is already in progress, wait for it instead of skipping
    if (refreshPromise) return refreshPromise

    // Skip if refreshed recently (< 2 minutes ago) unless forced
    const elapsed = Date.now() - lastRefreshTime
    if (!force && elapsed < 2 * 60 * 1000) return true

    refreshPromise = (async () => {
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
        refreshPromise = null
      }
    })()

    return refreshPromise
  }, [router])

  useEffect(() => {
    mountedRef.current = true

    // Proactive refresh: every 6 hours (well before 7d token expiry)
    const interval = setInterval(() => {
      doRefresh()
    }, 6 * 60 * 60 * 1000)

    // On tab focus: refresh if it's been more than 5 minutes since last refresh.
    // This catches the common case of returning to a backgrounded tab where
    // the interval timer was throttled by the browser.
    function onFocus() {
      const elapsed = Date.now() - lastRefreshTime
      if (elapsed > 60 * 60 * 1000) {
        doRefresh()
      }
    }
    window.addEventListener('focus', onFocus)

    // On visibilitychange: also handle mobile browsers that fire this instead of focus
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastRefreshTime
        if (elapsed > 60 * 60 * 1000) {
          doRefresh()
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    // Initial refresh only if we haven't refreshed recently
    if (Date.now() - lastRefreshTime > 2 * 60 * 1000) {
      doRefresh()
    }

    return () => {
      mountedRef.current = false
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [doRefresh])

  return { refresh: doRefresh }
}

/**
 * Attempt a single token refresh. Deduplicates concurrent calls.
 * Can be called from outside React (e.g. fetch interceptors).
 */
export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  const elapsed = Date.now() - lastRefreshTime
  if (elapsed < 2 * 60 * 1000) return true

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' })
      if (res.ok) {
        lastRefreshTime = Date.now()
        return true
      }
      return false
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}
