'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface AiFloatingButtonProps {
  onClick: () => void
}

const STORAGE_KEY = 'ai-fab-position'
const FAB_SIZE = 56

function getDefaultPosition() {
  if (typeof window === 'undefined') return { x: 0, y: 0 }
  return {
    x: window.innerWidth - FAB_SIZE - 24,
    y: window.innerHeight - FAB_SIZE - (window.innerWidth < 768 ? 144 : 24),
  }
}

function clamp(pos: { x: number; y: number }) {
  if (typeof window === 'undefined') return pos
  return {
    x: Math.max(8, Math.min(pos.x, window.innerWidth - FAB_SIZE - 8)),
    y: Math.max(8, Math.min(pos.y, window.innerHeight - FAB_SIZE - 8)),
  }
}

export function AiFloatingButton({ onClick }: AiFloatingButtonProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const dragging = useRef(false)
  const dragMoved = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const startTouch = useRef({ x: 0, y: 0 })

  // Load saved position on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setPosition(clamp(JSON.parse(saved)))
      } else {
        setPosition(getDefaultPosition())
      }
    } catch {
      setPosition(getDefaultPosition())
    }
  }, [])

  // Recalculate on resize
  useEffect(() => {
    function handleResize() {
      setPosition((prev) => prev ? clamp(prev) : getDefaultPosition())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true
    dragMoved.current = false
    startTouch.current = { x: e.clientX, y: e.clientY }
    setPosition((prev) => {
      startPos.current = prev || getDefaultPosition()
      return prev
    })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - startTouch.current.x
    const dy = e.clientY - startTouch.current.y
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragMoved.current = true
    }
    setPosition(clamp({
      x: startPos.current.x + dx,
      y: startPos.current.y + dy,
    }))
  }, [])

  const handlePointerUp = useCallback(() => {
    dragging.current = false
    if (dragMoved.current) {
      setPosition((prev) => {
        if (prev) {
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prev)) } catch { /* ignore */ }
        }
        return prev
      })
    }
  }, [])

  const handleClick = useCallback(() => {
    if (!dragMoved.current) {
      onClick()
    }
  }, [onClick])

  // Don't render until position is calculated (avoid flash)
  if (!position) return null

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      className="fixed z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-500/30 flex items-center justify-center hover:shadow-2xl hover:shadow-blue-500/40 active:scale-95 transition-shadow duration-300 ai-fab-glow touch-none select-none"
      title="Assistente AI — Trascina per spostare"
      aria-label="Apri assistente AI"
      // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop -- dynamic position
      style={{ left: position.x, top: position.y }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 drop-shadow-[0_0_6px_rgba(255,255,255,0.5)] pointer-events-none">
        <circle cx="12" cy="8" r="1.8" fill="currentColor" />
        <circle cx="7.5" cy="13.5" r="1.8" fill="currentColor" />
        <circle cx="16.5" cy="13.5" r="1.8" fill="currentColor" />
        <circle cx="12" cy="18" r="1.3" fill="currentColor" opacity="0.7" />
        <line x1="12" y1="9.8" x2="8.3" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        <line x1="12" y1="9.8" x2="15.7" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        <line x1="8.3" y1="15" x2="11.3" y2="17" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <line x1="15.7" y1="15" x2="12.7" y2="17" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <line x1="9.3" y1="13.5" x2="14.7" y2="13.5" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
      </svg>
    </button>
  )
}
