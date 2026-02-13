'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Zap } from 'lucide-react'
import { motion } from 'motion/react'

interface QuickAction {
  icon: React.ElementType
  title: string
  description: string
  onClick?: () => void
}

interface QuickActionsGridProps {
  actions: QuickAction[]
}

export function QuickActionsGrid({ actions }: QuickActionsGridProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Zap className="h-4 w-4" />
          </div>
          <h3 className="text-base font-semibold">Azioni Rapide</h3>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {actions.map((action, index) => {
            const Icon = action.icon
            return (
              <motion.button
                key={action.title}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={action.onClick}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/30 hover:border-primary/20 hover:bg-primary/5 transition-all text-left group active:scale-[0.98]"
              >
                <div className="p-2 rounded-md bg-secondary group-hover:bg-primary/10 transition-colors">
                  <Icon className="h-4 w-4 text-muted group-hover:text-primary transition-colors" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{action.title}</p>
                  <p className="text-xs text-muted truncate">{action.description}</p>
                </div>
              </motion.button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
