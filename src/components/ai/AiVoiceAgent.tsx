'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useConversation } from '@elevenlabs/react'
import { X, Mic, MicOff, Phone, PhoneOff, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TranscriptEntry {
  role: 'user' | 'agent'
  text: string
}

interface AiVoiceAgentProps {
  open: boolean
  onClose: () => void
}

export function AiVoiceAgent({ open, onClose }: AiVoiceAgentProps) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [showTranscript, setShowTranscript] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  const conversation = useConversation({
    onConnect: () => setError(null),
    onDisconnect: () => setError(null),
    onError: (message) => {
      console.error('[AiVoiceAgent] error:', message)
      setError('Errore di connessione. Riprova.')
    },
    onMessage: (msg) => {
      setTranscript(prev => [...prev, {
        role: msg.source === 'ai' ? 'agent' : 'user',
        text: msg.message,
      }])
    },
  })

  const { status, isSpeaking } = conversation

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  const startSession = useCallback(async () => {
    setError(null)
    setTranscript([])

    try {
      const res = await fetch('/api/ai/voice-agent/token')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Errore ottenimento token')
      }

      const { signedUrl } = await res.json()
      await conversation.startSession({ signedUrl })
    } catch (err) {
      console.error('[AiVoiceAgent] start error:', err)
      setError(err instanceof Error ? err.message : 'Errore avvio sessione')
    }
  }, [conversation])

  const endSession = useCallback(async () => {
    await conversation.endSession()
  }, [conversation])

  const handleClose = useCallback(async () => {
    if (status === 'connected') {
      await endSession()
    }
    onClose()
  }, [status, endSession, onClose])

  if (!open) return null

  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 md:mx-0 bg-card border border-border/40 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Phone className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Giusy</h3>
              <p className="text-xs text-muted">
                {status === 'disconnected' && 'Pronta per parlare'}
                {status === 'connecting' && 'Connessione in corso...'}
                {status === 'connected' && (isSpeaking ? 'Sta parlando...' : 'In ascolto...')}
                {status === 'disconnecting' && 'Chiusura...'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-secondary/60 transition-colors"
          >
            <X className="h-4 w-4 text-muted" />
          </button>
        </div>

        {/* Orb Animation */}
        <div className="flex flex-col items-center justify-center py-10 px-5">
          <div className="relative">
            {/* Outer ring */}
            <div className={cn(
              'absolute inset-0 rounded-full transition-all duration-500',
              isConnected && isSpeaking && 'animate-ping opacity-20 bg-cyan-400',
              isConnected && !isSpeaking && 'animate-pulse opacity-10 bg-blue-400',
            )} style={{ margin: '-12px' }} />

            {/* Main orb */}
            <div className={cn(
              'w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg',
              !isConnected && !isConnecting && 'bg-gradient-to-br from-slate-600 to-slate-700',
              isConnected && !isSpeaking && 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/30',
              isConnected && isSpeaking && 'bg-gradient-to-br from-cyan-400 to-blue-500 shadow-cyan-400/40 scale-110',
              isConnecting && 'bg-gradient-to-br from-slate-500 to-blue-600 animate-pulse',
            )}>
              {isConnected ? (
                isSpeaking ? (
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-1 bg-white rounded-full animate-bounce"
                        style={{
                          height: `${16 + (i % 3) * 8}px`,
                          animationDelay: `${i * 0.15}s`,
                          animationDuration: '0.6s',
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <Mic className="h-10 w-10 text-white/90" />
                )
              ) : (
                <Mic className="h-10 w-10 text-white/50" />
              )}
            </div>
          </div>

          {/* Status text */}
          <p className="mt-6 text-sm text-muted text-center">
            {status === 'disconnected' && !error && 'Premi il pulsante per parlare con Giusy'}
            {status === 'connecting' && 'Connessione in corso...'}
            {status === 'connected' && (isSpeaking ? 'Giusy sta parlando...' : 'Parla, ti ascolto...')}
            {error && <span className="text-red-400">{error}</span>}
          </p>
        </div>

        {/* Transcript (toggle) */}
        {showTranscript && transcript.length > 0 && (
          <div className="mx-5 mb-4 max-h-40 overflow-y-auto rounded-lg bg-secondary/30 border border-border/30 p-3 space-y-2">
            {transcript.map((entry, i) => (
              <div key={i} className={cn(
                'text-xs',
                entry.role === 'agent' ? 'text-cyan-400' : 'text-muted',
              )}>
                <span className="font-medium">{entry.role === 'agent' ? 'Giusy' : 'Tu'}:</span>{' '}
                {entry.text}
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 px-5 py-5 border-t border-border/30">
          {/* Transcript toggle */}
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={cn(
              'p-3 rounded-full transition-all',
              showTranscript ? 'bg-secondary text-foreground' : 'bg-secondary/50 text-muted hover:bg-secondary/80',
            )}
            title="Mostra trascrizione"
          >
            <MessageSquare className="h-5 w-5" />
          </button>

          {/* Mute toggle */}
          {isConnected && (
            <button
              onClick={() => conversation.setVolume({ volume: conversation.micMuted ? 1 : 0 })}
              className={cn(
                'p-3 rounded-full transition-all',
                conversation.micMuted ? 'bg-amber-500/20 text-amber-400' : 'bg-secondary/50 text-muted hover:bg-secondary/80',
              )}
              title={conversation.micMuted ? 'Riattiva audio' : 'Muta audio'}
            >
              {conversation.micMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          )}

          {/* Main action button */}
          {!isConnected ? (
            <button
              onClick={startSession}
              disabled={isConnecting}
              className={cn(
                'p-5 rounded-full transition-all shadow-lg',
                isConnecting
                  ? 'bg-blue-600/50 cursor-wait'
                  : 'bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 hover:scale-105 active:scale-95 shadow-cyan-500/30',
              )}
              title="Avvia conversazione"
            >
              <Phone className="h-7 w-7 text-white" />
            </button>
          ) : (
            <button
              onClick={endSession}
              className="p-5 rounded-full bg-red-500 hover:bg-red-400 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-red-500/30"
              title="Termina conversazione"
            >
              <PhoneOff className="h-7 w-7 text-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
