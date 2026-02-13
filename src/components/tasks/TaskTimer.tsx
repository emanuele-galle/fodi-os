'use client'

import { useState, useEffect, useCallback } from 'react'
import { Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface TaskTimerProps {
  taskId: string
  timerStartedAt: string | null
  timerUserId: string | null
  onTimerChange?: () => void
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export function TaskTimer({ taskId, timerStartedAt, timerUserId, onTimerChange }: TaskTimerProps) {
  const [isRunning, setIsRunning] = useState(!!timerStartedAt)
  const [startTime, setStartTime] = useState<Date | null>(timerStartedAt ? new Date(timerStartedAt) : null)
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setIsRunning(!!timerStartedAt)
    setStartTime(timerStartedAt ? new Date(timerStartedAt) : null)
  }, [timerStartedAt])

  useEffect(() => {
    if (!isRunning || !startTime) {
      setElapsed(0)
      return
    }
    const tick = () => setElapsed(Date.now() - startTime.getTime())
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [isRunning, startTime])

  const handleToggle = useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      const action = isRunning ? 'stop' : 'start'
      const res = await fetch(`/api/tasks/${taskId}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const data = await res.json()
        if (action === 'start') {
          setIsRunning(true)
          setStartTime(new Date(data.timerStartedAt))
        } else {
          setIsRunning(false)
          setStartTime(null)
          setElapsed(0)
        }
        onTimerChange?.()
      }
    } finally {
      setLoading(false)
    }
  }, [taskId, isRunning, loading, onTimerChange])

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        size="sm"
        variant={isRunning ? 'destructive' : 'outline'}
        onClick={handleToggle}
        disabled={loading}
        className="gap-1.5"
      >
        {isRunning ? (
          <>
            <Square className="h-3.5 w-3.5" />
            Stop
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5" />
            Timer
          </>
        )}
      </Button>
      {isRunning && (
        <span className="text-sm font-mono tabular-nums text-primary font-medium animate-pulse">
          {formatElapsed(elapsed)}
        </span>
      )}
    </div>
  )
}
