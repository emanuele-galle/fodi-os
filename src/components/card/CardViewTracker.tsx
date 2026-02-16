'use client'

import { useEffect, useRef } from 'react'

type CardViewTrackerProps = {
  slug: string
}

export default function CardViewTracker({ slug }: CardViewTrackerProps) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true

    fetch(`/api/c/${slug}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {
      // Fire-and-forget, ignore errors
    })
  }, [slug])

  return null
}
