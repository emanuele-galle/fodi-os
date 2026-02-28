'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X, GripVertical } from 'lucide-react'
import { AiChatPanel } from './AiChatPanel'
import { useRouter } from 'next/navigation'

interface AiChatSidebarProps {
  open: boolean
  onClose: () => void
}

export function AiChatSidebar({ open, onClose }: AiChatSidebarProps) {
  const router = useRouter()
  const [width, setWidth] = useState(380)
  const isResizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(380)

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

            <AiChatPanel
              compact
              onExpand={() => {
                onClose()
                router.push('/ai')
              }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
