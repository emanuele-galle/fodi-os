'use client'

import { cn } from '@/lib/utils'
import { useState } from 'react'

interface Tab {
  id: string
  label: string
  content: React.ReactNode
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  className?: string
}

export function Tabs({ tabs, defaultTab, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  return (
    <div className={className}>
      {/* Apple-style segmented control */}
      <div className="flex bg-secondary/60 rounded-xl p-1 overflow-x-auto scrollbar-none -mx-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 md:py-1.5 text-sm font-medium transition-all rounded-lg whitespace-nowrap touch-manipulation min-h-[44px] md:min-h-0 flex-1',
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-[var(--shadow-sm)]'
                : 'text-muted hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>
    </div>
  )
}
