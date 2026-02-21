'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import type { GuideFAQ as GuideFAQType } from '@/lib/guide-data'

interface GuideFAQProps {
  items: GuideFAQType[]
}

export function GuideFAQ({ items }: GuideFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="border border-border/30 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors text-left"
          >
            <span className="flex-1 text-sm font-medium">{item.question}</span>
            <ChevronDown
              className={`h-4 w-4 text-muted transition-transform duration-200 ${openIndex === i ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence>
            {openIndex === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="px-4 pb-4 text-sm text-muted leading-relaxed">{item.answer}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
