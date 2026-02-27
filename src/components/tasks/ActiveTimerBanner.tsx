'use client'

import { useState, useEffect, useCallback } from 'react'
import { Square, Clock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ActiveTimer {
  active: boolean
  taskId?: string
  taskTitle?: string
  timerStartedAt?: string
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

const ONE_HOUR = 60 * 60 * 1000
const THREE_HOURS = 3 * ONE_HOUR

export function ActiveTimerBanner() {
  const [timer, setTimer] = useState<ActiveTimer | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [stopping, setStopping] = useState(false)

  const fetchActiveTimer = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks/active-timer')
      if (res.ok) {
        const data = await res.json()
        setTimer(data)
      }
    } catch { /* ignore */ }
  }, [])

  // Poll every 30s for active timer changes
  useEffect(() => {
    fetchActiveTimer()
    const interval = setInterval(fetchActiveTimer, 30000)
    return () => clearInterval(interval)
  }, [fetchActiveTimer])

  // Tick elapsed time
  useEffect(() => {
    if (!timer?.active || !timer.timerStartedAt) {
      setElapsed(0)
      return
    }
    const startTime = new Date(timer.timerStartedAt).getTime()
    const tick = () => setElapsed(Date.now() - startTime)
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [timer])

  const handleStop = useCallback(async () => {
    if (!timer?.taskId || stopping) return
    setStopping(true)
    try {
      const res = await fetch(`/api/tasks/${timer.taskId}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      })
      if (res.ok) {
        setTimer({ active: false })
        setElapsed(0)
      }
    } finally {
      setStopping(false)
    }
  }, [timer, stopping])

  if (!timer?.active) return null

  const isWarning = elapsed >= ONE_HOUR && elapsed < THREE_HOURS
  const isDanger = elapsed >= THREE_HOURS

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2 text-sm border-b transition-colors ${
        isDanger
          ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200'
          : isWarning
            ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200'
            : 'bg-primary/5 border-primary/10 text-foreground'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isDanger ? (
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" />
        ) : isWarning ? (
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" />
        ) : (
          <Clock className="h-4 w-4 flex-shrink-0 text-primary animate-pulse" />
        )}
        <span className="truncate font-medium">
          {timer.taskTitle}
        </span>
        <span className="font-mono tabular-nums flex-shrink-0">
          {formatElapsed(elapsed)}
        </span>
        {isDanger && (
          <span className="text-xs hidden sm:inline">Timer attivo da oltre 3 ore</span>
        )}
        {isWarning && !isDanger && (
          <span className="text-xs hidden sm:inline">Timer attivo da oltre 1 ora</span>
        )}
      </div>
      <Button
        size="sm"
        variant="destructive"
        onClick={handleStop}
        disabled={stopping}
        className="gap-1 flex-shrink-0 h-7 text-xs"
      >
        <Square className="h-3 w-3" />
        Stop
      </Button>
    </div>
  )
}
