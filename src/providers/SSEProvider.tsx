'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { refreshAccessToken } from '@/hooks/useAuthRefresh'

export interface SSEMessage {
  type: string
  data: unknown
  channelId?: string
}

type SSEListener = (event: SSEMessage) => void

interface SSEContextValue {
  connected: boolean
  subscribe: (listener: SSEListener) => () => void
}

const SSEContext = createContext<SSEContextValue>({
  connected: false,
  subscribe: () => () => {},
})

export function SSEProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false)
  const listenersRef = useRef(new Set<SSEListener>())

  useEffect(() => {
    let retryDelay = 1000
    let es: EventSource | null = null
    let mounted = true
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let consecutiveErrors = 0

    function close() {
      es?.close()
      es = null
      if (retryTimer) {
        clearTimeout(retryTimer)
        retryTimer = null
      }
      if (mounted) setConnected(false)
    }

    function attempt() {
      if (!mounted || document.hidden) return
      close()
      es = new EventSource('/api/chat/stream')

      es.onopen = () => {
        if (mounted) {
          setConnected(true)
          retryDelay = 1000
          consecutiveErrors = 0
        }
      }

      es.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data) as SSEMessage
          for (const listener of listenersRef.current) {
            listener(parsed)
          }
        } catch {
          // Ignore malformed messages
        }
      }

      es.onerror = () => {
        if (!mounted) return
        setConnected(false)
        es?.close()
        consecutiveErrors++

        // Only refresh auth token every 3rd error to avoid hammering refresh endpoint
        // on proxy/network issues (most SSE drops are not auth-related)
        const shouldRefresh = consecutiveErrors % 3 === 1
        const reconnect = () => {
          if (!mounted || document.hidden) return
          retryTimer = setTimeout(() => {
            if (mounted) attempt()
          }, retryDelay)
          retryDelay = Math.min(retryDelay * 2, 30000)
        }

        if (shouldRefresh) {
          refreshAccessToken().finally(reconnect)
        } else {
          reconnect()
        }
      }
    }

    // Pause SSE when tab hidden, resume when visible
    function onVisibilityChange() {
      if (document.hidden) {
        close()
      } else {
        retryDelay = 1000
        consecutiveErrors = 0
        attempt()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    attempt()
    return () => {
      mounted = false
      document.removeEventListener('visibilitychange', onVisibilityChange)
      close()
    }
  }, [])

  const subscribe = useCallback((listener: SSEListener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  return (
    <SSEContext.Provider value={{ connected, subscribe }}>
      {children}
    </SSEContext.Provider>
  )
}

export const useSSEContext = () => useContext(SSEContext)
