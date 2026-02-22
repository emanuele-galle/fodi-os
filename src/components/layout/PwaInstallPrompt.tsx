'use client'
import { brandClient } from '@/lib/branding-client'

import { useState, useEffect } from 'react'
import { Download, X, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Check dismissal
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedAt = parseInt(dismissed)
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return
    }

    // Detect iOS
    const ua = navigator.userAgent
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(isiOS)

    if (isiOS) {
      // On iOS, show banner after 3 seconds
      const timer = setTimeout(() => setShowBanner(true), 3000)
      return () => clearTimeout(timer)
    }

    // Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowBanner(false)
      }
      setDeferredPrompt(null)
    } else if (isIOS) {
      setShowIOSGuide(true)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setShowIOSGuide(false)
    localStorage.setItem('pwa-install-dismissed', String(Date.now()))
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-slide-up">
      <div className="bg-card border border-border/40 rounded-2xl shadow-[var(--shadow-xl)] p-4">
        {showIOSGuide ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Installa {brandClient.name}</h3>
              <button onClick={handleDismiss} className="p-1 rounded-lg hover:bg-secondary/60">
                <X className="h-4 w-4 text-muted" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-muted">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-[10px]">1</span>
                <span>Tocca l&apos;icona <Share className="inline h-3.5 w-3.5 text-primary" /> in basso</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-[10px]">2</span>
                <span>Scorri e tocca &quot;Aggiungi a Home&quot;</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-[10px]">3</span>
                <span>Tocca &quot;Aggiungi&quot; in alto a destra</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 flex-shrink-0">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">Installa {brandClient.name}</h3>
              <p className="text-xs text-muted mt-0.5">Accesso rapido dalla home del tuo dispositivo</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors"
              >
                Non ora
              </button>
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Installa
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
