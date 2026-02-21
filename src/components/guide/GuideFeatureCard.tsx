'use client'

import { motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'

interface GuideFeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  index: number
  color: string
}

export function GuideFeatureCard({ icon: Icon, title, description, index, color }: GuideFeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="group rounded-xl border border-border/30 bg-card p-5 hover:border-border/60 transition-colors"
    >
      <div
        className="h-10 w-10 rounded-lg flex items-center justify-center mb-3"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <h3 className="text-sm font-semibold mb-1.5">{title}</h3>
      <p className="text-xs text-muted leading-relaxed">{description}</p>
    </motion.div>
  )
}
