'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Phone, PhoneOff, Video } from 'lucide-react'
import { useSSE } from '@/hooks/useSSE'
import { Button } from '@/components/ui/Button'

interface CallData {
  meetLink: string
  summary: string
  creatorName: string
  channelId?: string
  channelName?: string
}

export function IncomingCallBanner() {
  const [call, setCall] = useState<CallData | null>(null)
  const [visible, setVisible] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopRinging = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const dismiss = useCallback(() => {
    stopRinging()
    setVisible(false)
    setTimeout(() => setCall(null), 300)
  }, [stopRinging])

  const answer = useCallback(() => {
    if (call?.meetLink) {
      window.open(call.meetLink, '_blank', 'noopener,noreferrer')
    }
    dismiss()
  }, [call, dismiss])

  useSSE(useCallback((event) => {
    if (event.type === 'incoming_call' && event.data) {
      const data = event.data as CallData
      setCall(data)
      setVisible(true)

      // Play ringtone
      try {
        const audio = new Audio('/sounds/ringtone.wav')
        audio.loop = true
        audio.volume = 0.7
        audio.play().catch(() => {})
        audioRef.current = audio
      } catch {}

      // Auto-dismiss after 30 seconds
      timerRef.current = setTimeout(() => {
        dismiss()
      }, 30000)
    }
  }, [dismiss]))

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRinging()
    }
  }, [stopRinging])

  if (!call) return null

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-card border border-primary/30 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-4 min-w-[320px] max-w-[480px] animate-pulse-slow">
        {/* Call icon */}
        <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 animate-bounce">
          <Video className="h-6 w-6 text-green-500" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{call.creatorName}</p>
          <p className="text-xs text-muted truncate">
            {call.channelName ? `Chiamata da "${call.channelName}"` : call.summary}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-full bg-red-500/15 text-red-500 hover:bg-red-500/25"
            onClick={dismiss}
            aria-label="Rifiuta chiamata"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            className="h-10 w-10 rounded-full bg-green-500 text-white hover:bg-green-600"
            onClick={answer}
            aria-label="Rispondi alla chiamata"
          >
            <Phone className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
