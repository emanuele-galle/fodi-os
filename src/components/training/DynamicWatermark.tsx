'use client'

import { useState, useEffect } from 'react'

interface DynamicWatermarkProps {
  userName: string
  userEmail: string
}

export function DynamicWatermark({ userName, userEmail }: DynamicWatermarkProps) {
  const [timestamp, setTimestamp] = useState(() => formatTimestamp())

  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(formatTimestamp())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const text = `${userName} - ${userEmail} - ${timestamp}`

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="absolute inset-[-50%] flex flex-wrap gap-y-[100px]"
        style={{ transform: 'rotate(-30deg)' }}
      >
        {Array.from({ length: 80 }).map((_, i) => (
          <span
            key={i}
            className="inline-block w-[250px] text-center text-xs whitespace-nowrap select-none"
            style={{ color: 'rgba(128, 128, 128, 0.08)' }}
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  )
}

function formatTimestamp(): string {
  return new Date().toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
