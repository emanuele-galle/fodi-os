'use client'

import { Users, Clock, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { motion } from 'motion/react'

interface TeamMember {
  id: string
  name: string
  avatarUrl?: string
}

interface BreakdownItem {
  label: string
  value: number
  color: string
}

interface TeamActivityCardProps {
  totalHours: number
  breakdown: BreakdownItem[]
  members: TeamMember[]
  onManageTeam?: () => void
}

export function TeamActivityCard({
  totalHours,
  breakdown,
  members,
  onManageTeam,
}: TeamActivityCardProps) {
  const maxValue = Math.max(...breakdown.map((b) => b.value), 1)

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Users className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold">Attività Team</h3>
              <p className="text-[11px] text-muted mt-0.5">Questa settimana</p>
            </div>
          </div>
          {onManageTeam && (
            <button
              onClick={onManageTeam}
              className="text-xs font-medium text-primary hover:text-primary/80 px-3 py-1.5 rounded-md bg-primary/5 hover:bg-primary/10 transition-all flex items-center gap-1"
            >
              Team <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Hours summary */}
        <div className="flex items-center gap-2 mb-5">
          <Clock className="h-4 w-4 text-muted" />
          <span className="text-sm text-muted">Ore questa settimana</span>
          <span className="text-2xl font-bold ml-auto tabular-nums">{totalHours.toFixed(1)}h</span>
        </div>

        {/* Breakdown bars */}
        <div className="space-y-3 mb-5">
          {breakdown.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted font-medium">{item.label}</span>
                <span className="font-semibold tabular-nums">{item.value}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / maxValue) * 100}%` }}
                  transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
                  className={`h-full rounded-full ${item.color}`}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Team members */}
        <div className="pt-4 border-t border-border/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{members.length} memb{members.length === 1 ? 'ro' : 'ri'}</span>
            <div className="flex -space-x-2">
              {members.slice(0, 5).map((member) => (
                <div key={member.id} className="ring-2 ring-card rounded-full">
                  <Avatar name={member.name} src={member.avatarUrl} size="xs" />
                </div>
              ))}
              {members.length > 5 && (
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium ring-2 ring-card">
                  +{members.length - 5}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
