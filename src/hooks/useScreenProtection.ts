'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface SecurityEvent {
  type: string
  timestamp: number
  details?: string
}

export function useScreenProtection(lessonId?: string) {
  const [isProtected, setIsProtected] = useState(true)
  const eventsBuffer = useRef<SecurityEvent[]>([])

  const addEvent = useCallback((type: string, details?: string) => {
    eventsBuffer.current.push({ type, timestamp: Date.now(), details })
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- sets protection flag after registering event listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        addEvent('tab_switch', 'Tab became hidden')
      }
    }

    const handleBeforePrint = () => {
      addEvent('print_attempt', 'User attempted to print')
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault()
        addEvent('screenshot_attempt', 'PrintScreen key pressed')
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault()
        addEvent('devtools_shortcut', 'Ctrl+Shift+I pressed')
      }
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault()
        addEvent('print_shortcut', 'Ctrl+P pressed')
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      addEvent('context_menu', 'Right-click blocked')
    }

    const checkDevTools = () => {
      const threshold = 200
      if (window.outerHeight - window.innerHeight > threshold ||
          window.outerWidth - window.innerWidth > threshold) {
        addEvent('devtools_open', 'DevTools likely open')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeprint', handleBeforePrint)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('contextmenu', handleContextMenu)

    const devToolsInterval = setInterval(checkDevTools, 3000)

    const flushInterval = setInterval(() => {
      if (eventsBuffer.current.length === 0) return
      const events = [...eventsBuffer.current]
      eventsBuffer.current = []

      fetch('/api/training/security/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, events }),
      }).catch(() => {})
    }, 5000)

    setIsProtected(true)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeprint', handleBeforePrint)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('contextmenu', handleContextMenu)
      clearInterval(devToolsInterval)
      clearInterval(flushInterval)
    }
  }, [lessonId, addEvent])

  return { isProtected }
}
