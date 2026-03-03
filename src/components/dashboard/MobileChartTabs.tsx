'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop -- handlers in render */

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
      <div className="flex gap-0.5 p-[3px] rounded-[10px] bg-secondary/60 mb-4">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className={cn(
              'flex-1 text-[13px] font-medium py-[7px] px-3 rounded-[8px] transition-all duration-200 touch-manipulation',
              activeTab === i
                ? 'bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                : 'text-muted active:opacity-60'
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
