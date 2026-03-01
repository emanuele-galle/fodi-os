'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Tab {
  label: string
  content: React.ReactNode
}

interface MobileChartTabsProps {
  tabs: Tab[]
}

export function MobileChartTabs({ tabs }: MobileChartTabsProps) {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-lg bg-secondary/50 mb-4">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className={cn(
              'flex-1 text-xs font-medium py-2 px-3 rounded-md transition-all touch-manipulation',
              activeTab === i
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <div className="animate-fade-in">
        {tabs[activeTab].content}
      </div>
    </div>
  )
}
