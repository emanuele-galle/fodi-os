'use client'

import { motion } from 'motion/react'
import { Lightbulb } from 'lucide-react'
import type { GuideWorkflowStep } from '@/lib/guide-data'

interface GuideWorkflowProps {
  steps: GuideWorkflowStep[]
  color: string
}

export function GuideWorkflow({ steps, color }: GuideWorkflowProps) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div
        className="absolute left-5 top-6 bottom-6 w-px opacity-20"
        style={{ backgroundColor: color }}
      />

      <div className="space-y-6">
        {steps.map((s, i) => (
          <motion.div
            key={s.step}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="relative flex gap-4"
          >
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 z-10"
              style={{ backgroundColor: color }}
            >
              {s.step}
            </div>
            <div className="flex-1 pt-1">
              <h4 className="text-sm font-semibold mb-1">{s.title}</h4>
              <p className="text-xs text-muted leading-relaxed">{s.description}</p>
              {s.tip && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <Lightbulb className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span>{s.tip}</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
