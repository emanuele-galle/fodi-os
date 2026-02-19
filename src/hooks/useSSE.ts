'use client'

import { useEffect, useRef } from 'react'
import { useSSEContext, type SSEMessage } from '@/providers/SSEProvider'

export type { SSEMessage }

export function useSSE(onMessage: (event: SSEMessage) => void) {
  const { connected, subscribe } = useSSEContext()
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    return subscribe((event) => onMessageRef.current(event))
  }, [subscribe])

  return { connected }
}
