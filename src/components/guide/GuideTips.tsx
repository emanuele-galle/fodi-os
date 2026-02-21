'use client'

import { motion } from 'motion/react'
import { Lightbulb } from 'lucide-react'

interface GuideTipsProps {
  tips: string[]
}

export function GuideTips({ tips }: GuideTipsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {tips.map((tip, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10"
        >
          <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-muted leading-relaxed">{tip}</span>
        </motion.div>
      ))}
    </div>
  )
}
