'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useSSEContext, type SSEMessage } from '@/providers/SSEProvider'

export type { SSEMessage }

export function useSSE(onMessage: (event: SSEMessage) => void) {
  const { connected, subscribe } = useSSEContext()
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  })

  const stableCallback = useCallback((event: SSEMessage) => onMessageRef.current(event), [])

  useEffect(() => {
    return subscribe(stableCallback)
  }, [subscribe, stableCallback])

  return { connected }
}
