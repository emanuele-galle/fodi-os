'use client'

import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { AiChatPanel } from './AiChatPanel'
import { useRouter } from 'next/navigation'

interface AiChatSidebarProps {
  open: boolean
  onClose: () => void
}

export function AiChatSidebar({ open, onClose }: AiChatSidebarProps) {
  const router = useRouter()

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
            className="fixed top-0 right-0 h-full w-full sm:w-[380px] bg-background border-l border-border z-50 flex flex-col shadow-2xl"
          >
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
