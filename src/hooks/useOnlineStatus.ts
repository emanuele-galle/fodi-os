'use client'

import { useState, useEffect, useCallback } from 'react'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

/**
 * Queue offline actions and sync when back online.
 */
const QUEUE_KEY = 'fodi-offline-queue'

interface QueuedAction {
  id: string
  url: string
  method: string
  body?: string
  timestamp: number
}

export function useOfflineQueue() {
  const isOnline = useOnlineStatus()

  const enqueue = useCallback((url: string, method: string, body?: unknown) => {
    const queue = getQueue()
    queue.push({
      id: Date.now().toString(),
      url,
      method,
      body: body ? JSON.stringify(body) : undefined,
      timestamp: Date.now(),
    })
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  }, [])

  // Sync queue when coming back online
  useEffect(() => {
    if (!isOnline) return

    const queue = getQueue()
    if (queue.length === 0) return

    // Process queue
    const remaining: QueuedAction[] = []
    Promise.allSettled(
      queue.map(action =>
        fetch(action.url, {
          method: action.method,
          headers: action.body ? { 'Content-Type': 'application/json' } : undefined,
          body: action.body,
        })
      )
    ).then(results => {
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          remaining.push(queue[i])
        }
      })
      localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
    })
  }, [isOnline])

  return { isOnline, enqueue }
}

function getQueue(): QueuedAction[] {
  try {
    const stored = localStorage.getItem(QUEUE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}
