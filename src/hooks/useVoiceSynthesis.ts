'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface VoiceConfig {
  provider: string
  voices: { id: string; name: string; language: string }[]
  currentVoice: string | null
  autoPlay: boolean
}

interface UseVoiceSynthesisReturn {
  isPlaying: boolean
  isLoading: boolean
  config: VoiceConfig | null
  speak: (text: string, messageId?: string) => Promise<void>
  stop: () => void
  loadConfig: () => Promise<void>
}

export function useVoiceSynthesis(): UseVoiceSynthesisReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [config, setConfig] = useState<VoiceConfig | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentMessageRef = useRef<string | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/tts')
      if (res.ok) {
        const { data } = await res.json()
        setConfig(data)
      }
    } catch {
      // Config loading is best-effort
    }
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setIsPlaying(false)
    currentMessageRef.current = null
  }, [])

  const speak = useCallback(async (text: string, messageId?: string) => {
    // If playing the same message, stop it
    if (isPlaying && messageId && currentMessageRef.current === messageId) {
      stop()
      return
    }

    // Stop any current playback
    stop()

    if (!text.trim() || config?.provider === 'disabled') return

    setIsLoading(true)
    currentMessageRef.current = messageId || null

    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `TTS error ${res.status}`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => {
        setIsPlaying(false)
        currentMessageRef.current = null
        URL.revokeObjectURL(url)
      }

      audio.onerror = () => {
        setIsPlaying(false)
        currentMessageRef.current = null
        URL.revokeObjectURL(url)
      }

      await audio.play()
      setIsPlaying(true)
    } catch (err) {
      console.error('TTS error:', err)
      setIsPlaying(false)
    } finally {
      setIsLoading(false)
    }
  }, [isPlaying, config?.provider, stop])

  return { isPlaying, isLoading, config, speak, stop, loadConfig }
}
