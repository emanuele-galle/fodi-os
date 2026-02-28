'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Loader2, WifiOff } from 'lucide-react'

export function AiVoiceWidget() {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptLoaded = useRef(false)
  const widgetInserted = useRef(false)

  // Load ElevenLabs embed script
  useEffect(() => {
    if (scriptLoaded.current) return
    if (document.querySelector('script[src*="convai-widget-embed"]')) {
      scriptLoaded.current = true
      return
    }
    scriptLoaded.current = true
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed'
    script.async = true
    document.body.appendChild(script)
  }, [])

  // Get signed URL from our API
  useEffect(() => {
    let cancelled = false
    fetch('/api/ai/voice-agent/token')
      .then(r => {
        if (!r.ok) throw new Error('Auth error')
        return r.json()
      })
      .then(data => {
        if (!cancelled) {
          setSignedUrl(data.signedUrl)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Impossibile connettersi all\'assistente vocale')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  // Insert widget via DOM when signed URL is ready
  const insertWidget = useCallback(() => {
    if (!signedUrl || !containerRef.current || widgetInserted.current) return
    widgetInserted.current = true

    const widget = document.createElement('elevenlabs-convai')
    widget.setAttribute('signed-url', signedUrl)
    widget.setAttribute('avatar-orb-color-1', '#8b5cf6')
    widget.setAttribute('avatar-orb-color-2', '#a855f7')
    widget.setAttribute('variant', 'expanded')
    widget.style.width = '100%'
    widget.style.maxWidth = '100%'
    widget.style.height = '100%'

    containerRef.current.appendChild(widget)
  }, [signedUrl])

  useEffect(() => {
    insertWidget()
    const container = containerRef.current
    return () => {
      if (container) {
        container.innerHTML = ''
      }
      widgetInserted.current = false
    }
  }, [insertWidget])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <p className="text-sm">Connessione a Giusy...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground px-6">
        <WifiOff className="h-8 w-8 text-red-400" />
        <p className="text-sm text-center">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-violet-400 hover:text-violet-300 underline"
        >
          Riprova
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 flex items-center justify-center p-4" />
  )
}
