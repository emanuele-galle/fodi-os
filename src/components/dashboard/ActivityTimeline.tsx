'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { History } from 'lucide-react'
import { motion } from 'motion/react'

interface ActivityItem {
  id: string
  icon: React.ElementType
  message: React.ReactNode
  timestamp: string
  iconColorClass?: string
}

interface ActivityTimelineProps {
  activities: ActivityItem[]
  maxItems?: number
  title?: string
}

export function ActivityTimeline({ activities, maxItems = 10, title = 'Attivita Recenti' }: ActivityTimelineProps) {
  const items = activities.slice(0, maxItems)

  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <History className="h-4 w-4" />
          </div>
          <h3 className="text-base font-semibold">{title}</h3>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">Nessuna attivita recente.</p>
        ) : (
          <div className="space-y-0.5">
            {items.map((item, index) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="flex items-start gap-3 py-2.5 relative"
                >
                  {/* Timeline line */}
                  {index < items.length - 1 && (
                    <div className="absolute left-[15px] top-[36px] w-px h-[calc(100%-20px)] bg-border/40" />
                  )}

                  <div className={`p-1.5 rounded-md flex-shrink-0 ${item.iconColorClass || 'bg-secondary text-muted'}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">{item.message}</p>
                    <p className="text-xs text-muted mt-0.5">{item.timestamp}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
