'use client'

import { DAYS } from './constants'

export function LoadingSkeleton() {
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((d) => (
          <div key={d} className="h-8 rounded bg-secondary/40 animate-pulse" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, row) => (
        <div key={row} className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, col) => (
            <div key={col} className="h-16 md:h-24 rounded bg-secondary/30 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  )
}
