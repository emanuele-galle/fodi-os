'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop -- event handlers */

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
      {/* iOS segmented control */}
      <div className="flex gap-0.5 p-[3px] rounded-[10px] bg-secondary/60 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 text-[13px] font-medium py-[7px] px-3 rounded-[8px] transition-all duration-200 touch-manipulation whitespace-nowrap min-h-[44px] md:min-h-0',
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                : 'text-muted active:opacity-60'
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
