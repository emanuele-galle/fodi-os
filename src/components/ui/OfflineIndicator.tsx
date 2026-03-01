'use client'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { WifiOff, Wifi } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export function OfflineIndicator() {
  const isOnline = useOnlineStatus()
  const [showReconnected, setShowReconnected] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true)
    } else if (wasOffline) {
      setShowReconnected(true)
      const timer = setTimeout(() => {
        setShowReconnected(false)
        setWasOffline(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  if (isOnline && !showReconnected) return null

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-1.5 text-xs font-medium transition-all duration-300',
        'md:hidden', // Only on mobile
        isOnline
          ? 'bg-accent/90 text-white animate-slide-up'
          : 'bg-destructive/90 text-white'
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="h-3.5 w-3.5" />
          <span>Connessione ripristinata</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>Sei offline — i dati mostrati potrebbero non essere aggiornati</span>
        </>
      )}
    </div>
  )
}
