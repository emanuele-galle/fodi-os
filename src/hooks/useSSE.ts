'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface SSEMessage {
  type: string
  data: unknown
  channelId?: string
}

export function useSSE(onMessage: (event: SSEMessage) => void) {
  const [connected, setConnected] = useState(false)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    let retryDelay = 1000
    let eventSource: EventSource | null = null
    let mounted = true

    function attempt() {
      if (!mounted) return

      eventSource = new EventSource('/api/chat/stream')

      eventSource.onopen = () => {
        if (mounted) {
          setConnected(true)
          retryDelay = 1000
        }
      }

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as SSEMessage
          onMessageRef.current(parsed)
        } catch {
          // Ignore malformed messages
        }
      }

      eventSource.onerror = () => {
        if (!mounted) return
        setConnected(false)
        eventSource?.close()

        // Reconnect with exponential backoff
        setTimeout(() => {
          if (mounted) attempt()
        }, retryDelay)
        retryDelay = Math.min(retryDelay * 2, 30000)
      }
    }

    attempt()

    return () => {
      mounted = false
      eventSource?.close()
      setConnected(false)
    }
  }, [])

  useEffect(() => {
    const cleanup = connect()
    return cleanup
  }, [connect])

  return { connected }
}
