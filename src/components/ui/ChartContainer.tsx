'use client'

import { useState, useEffect, type ReactNode, type CSSProperties } from 'react'

/**
 * Wrapper for recharts ResponsiveContainer that delays rendering
 * until after mount, preventing the -1 width/height measurement
 * issue during SSR hydration when CSS layout isn't computed yet.
 */
export function ChartContainer({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className={className} style={style}>
      {ready ? children : null}
    </div>
  )
}
