'use client'

import { useCallback, useRef } from 'react'
import { useSSE } from '@/hooks/useSSE'

/**
 * Subscribes to SSE data_changed events for a specific entity type.
 * Debounces rapid events (e.g., batch operations) to avoid N refetches.
 */
export function useRealtimeRefresh(entity: string, onRefresh: () => void, debounceMs = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useSSE(
    useCallback(
      (event) => {
        if (event.type === 'data_changed' && (event.data as { entity?: string })?.entity === entity) {
          if (timerRef.current) clearTimeout(timerRef.current)
          timerRef.current = setTimeout(() => {
            timerRef.current = null
            onRefresh()
          }, debounceMs)
        }
      },
      [entity, onRefresh, debounceMs]
    )
  )
}
