'use client'

import { useRef, useState, useEffect, type ReactNode, type CSSProperties } from 'react'

/**
 * Wrapper for recharts ResponsiveContainer that delays rendering
 * until the container has positive dimensions, preventing the
 * "width(-1) and height(-1)" console warning.
 *
 * Uses ResizeObserver to detect when the container is laid out.
 */
export function ChartContainer({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Check immediately — if already laid out, render right away
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      setReady(true)
      return
    }

    // Otherwise wait for layout via ResizeObserver
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          setReady(true)
          observer.disconnect()
          return
        }
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={className} style={style}>
      {ready ? children : null}
    </div>
  )
}
