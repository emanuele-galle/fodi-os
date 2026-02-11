'use client'

import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { User } from 'lucide-react'

export interface AvatarStackUser {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
}

export interface AvatarStackProps {
  users: AvatarStackUser[]
  max?: number
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

const sizeConfig = {
  xs: { container: 'h-5 w-5 text-[8px]', overlap: '-ml-1.5', ring: 'ring-1', icon: 'h-3 w-3' },
  sm: { container: 'h-7 w-7 text-[10px]', overlap: '-ml-2', ring: 'ring-2', icon: 'h-3.5 w-3.5' },
  md: { container: 'h-8 w-8 text-xs', overlap: '-ml-2.5', ring: 'ring-2', icon: 'h-4 w-4' },
}

export function AvatarStack({ users, max = 3, size = 'sm', className }: AvatarStackProps) {
  const config = sizeConfig[size]
  const visible = users.slice(0, max)
  const overflow = users.length - max
  const hiddenNames = users.slice(max).map((u) => `${u.firstName} ${u.lastName}`)

  if (users.length === 0) {
    return (
      <div
        className={cn(
          'rounded-full flex items-center justify-center bg-secondary text-muted',
          config.container,
          className
        )}
      >
        <User className={config.icon} />
      </div>
    )
  }

  return (
    <div className={cn('flex items-center', className)}>
      {visible.map((user, i) => (
        <div
          key={user.id}
          className={cn(
            'relative rounded-full ring-card transition-transform hover:scale-110 hover:z-10',
            config.ring,
            i > 0 && config.overlap
          )}
          style={{ zIndex: visible.length - i }}
        >
          <Avatar
            src={user.avatarUrl}
            name={`${user.firstName} ${user.lastName}`}
            size={size === 'md' ? 'sm' : 'xs'}
            className={config.container}
          />
        </div>
      ))}
      {overflow > 0 && (
        <div className="tooltip-wrapper">
          <div
            className={cn(
              'relative rounded-full flex items-center justify-center bg-secondary text-muted font-medium',
              config.ring,
              'ring-card',
              config.container,
              config.overlap
            )}
            style={{ zIndex: 0 }}
          >
            +{overflow}
          </div>
          <span className="tooltip-content tooltip-top">
            {hiddenNames.join(', ')}
          </span>
        </div>
      )}
    </div>
  )
}
