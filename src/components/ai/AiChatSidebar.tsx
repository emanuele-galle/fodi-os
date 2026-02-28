'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X, GripVertical, MessageSquare, Mic } from 'lucide-react'
import { AiChatPanel } from './AiChatPanel'
import { AiVoiceWidget } from './AiVoiceWidget'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type TabType = 'chat' | 'voice'

interface AiChatSidebarProps {
  open: boolean
  onClose: () => void
  initialTab?: TabType
}

export function AiChatSidebar({ open, onClose, initialTab = 'chat' }: AiChatSidebarProps) {
  const router = useRouter()
  const [width, setWidth] = useState(380)
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const isResizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(380)
  const prevOpen = useRef(open)

  // Check if voice agent is enabled
  useEffect(() => {
    let cancelled = false
    fetch('/api/ai/config/public')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data?.data?.voiceAgentEnabled) setVoiceEnabled(true)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Sync initialTab when sidebar opens
  if (open && !prevOpen.current) {
    setActiveTab(initialTab)
  }
  prevOpen.current = open

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true
    startX.current = e.clientX
    startWidth.current = width
    e.preventDefault()
  }, [width])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const delta = startX.current - e.clientX
      const newWidth = Math.min(600, Math.max(380, startWidth.current + delta))
      setWidth(newWidth)
    }
    const handleMouseUp = () => {
      isResizing.current = false
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop on mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-50 md:hidden"
          />

          {/* Sidebar panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            style={{ width: `${width}px` }}
            className="fixed top-0 right-0 h-full sm:w-auto w-full backdrop-blur-xl bg-background/95 border-l border-border z-50 flex flex-col shadow-2xl shadow-black/20"
          >
            {/* Resize handle */}
            <div
              onMouseDown={handleMouseDown}
              className="absolute left-0 top-0 bottom-0 w-3 cursor-col-resize z-10 group hidden sm:flex items-center justify-center hover:bg-violet-500/10 transition-colors"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors" />
            </div>

            {/* Close button (mobile overlay) */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-lg hover:bg-muted transition-colors md:hidden"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Tab switcher */}
            {voiceEnabled && (
              <div className="flex border-b border-border/50 px-3 pt-2 gap-1">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors',
                    activeTab === 'chat'
                      ? 'bg-violet-500/10 text-violet-400 border-b-2 border-violet-500'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Chat
                </button>
                <button
                  onClick={() => setActiveTab('voice')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors',
                    activeTab === 'voice'
                      ? 'bg-violet-500/10 text-violet-400 border-b-2 border-violet-500'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  <Mic className="h-3.5 w-3.5" />
                  Voce
                </button>
              </div>
            )}

            {/* Content */}
            {activeTab === 'chat' ? (
              <AiChatPanel
                compact
                onExpand={() => {
                  onClose()
                  router.push('/ai')
                }}
              />
            ) : (
              <AiVoiceWidget />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
