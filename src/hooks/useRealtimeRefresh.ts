'use client'

import { useCallback } from 'react'
import { useSSE } from '@/hooks/useSSE'

export function useRealtimeRefresh(entity: string, onRefresh: () => void) {
  useSSE(
    useCallback(
      (event) => {
        if (event.type === 'data_changed' && (event.data as { entity?: string })?.entity === entity) {
          onRefresh()
        }
      },
      [entity, onRefresh]
    )
  )
}
