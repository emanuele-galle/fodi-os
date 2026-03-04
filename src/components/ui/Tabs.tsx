'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop -- event handlers */

import { cn } from '@/lib/utils'
import { useState, useRef, useCallback } from 'react'

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
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1
    }
    if (nextIndex !== null) {
      e.preventDefault()
      const nextTab = tabs[nextIndex]
      setActiveTab(nextTab.id)
      tabsRef.current[nextIndex]?.focus()
    }
  }, [tabs])

  return (
    <div className={className}>
      {/* iOS segmented control */}
      <div role="tablist" className="flex gap-0.5 p-[3px] rounded-[10px] bg-secondary/60 overflow-x-auto scrollbar-none">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              ref={(el) => { tabsRef.current[index] = el }}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                'flex-1 text-[13px] font-medium py-[7px] px-3 rounded-[8px] transition-all duration-200 touch-manipulation whitespace-nowrap min-h-[44px] md:min-h-0',
                isActive
                  ? 'bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'text-muted active:opacity-60'
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="mt-4"
      >
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>
    </div>
  )
}
