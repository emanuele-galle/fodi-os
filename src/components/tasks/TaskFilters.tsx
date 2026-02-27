import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { STATUS_OPTIONS, PRIORITY_OPTIONS, type TabKey, type TabDef } from './types'

interface TaskTabBarProps {
  tabs: TabDef[]
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  tabCounts: Record<TabKey, number>
}

export function TaskTabBar({ tabs, activeTab, onTabChange, tabCounts }: TaskTabBarProps) {
  return (
    <div className="flex bg-secondary/60 rounded-lg p-1 mb-4 overflow-x-auto scrollbar-none">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const count = tabCounts[tab.key]
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 md:py-1.5 text-sm font-medium transition-all rounded-lg whitespace-nowrap touch-manipulation min-h-[44px] md:min-h-0 flex-1',
              activeTab === tab.key
                ? 'bg-card text-foreground shadow-[var(--shadow-sm)]'
                : 'text-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span>{tab.label}</span>
            {count > 0 && (
              <span className={cn(
                'text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                activeTab === tab.key
                  ? 'bg-primary/10 text-primary'
                  : 'bg-secondary text-muted'
              )}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface TaskFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  priorityFilter: string
  onPriorityChange: (value: string) => void
  projectFilter: string
  onProjectChange: (value: string) => void
  assigneeFilter: string
  onAssigneeChange: (value: string) => void
  sortBy: string
  onSortChange: (value: string) => void
  projects: { id: string; name: string }[]
  users: { id: string; firstName: string; lastName: string }[]
}

export function TaskFilters({
  searchQuery, onSearchChange,
  statusFilter, onStatusChange,
  priorityFilter, onPriorityChange,
  projectFilter, onProjectChange,
  assigneeFilter, onAssigneeChange,
  sortBy, onSortChange,
  projects, users,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 md:gap-3 mb-6">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <Input
          placeholder="Cerca task..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select
        options={STATUS_OPTIONS}
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        className="w-full sm:w-48"
      />
      <Select
        options={PRIORITY_OPTIONS}
        value={priorityFilter}
        onChange={(e) => onPriorityChange(e.target.value)}
        className="w-full sm:w-48"
      />
      <Select
        options={[{ value: '', label: 'Tutti i progetti' }, ...projects.map(p => ({ value: p.id, label: p.name }))]}
        value={projectFilter}
        onChange={(e) => onProjectChange(e.target.value)}
        className="w-full sm:w-48"
      />
      <Select
        options={[{ value: '', label: 'Tutti gli assegnatari' }, ...users.map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))]}
        value={assigneeFilter}
        onChange={(e) => onAssigneeChange(e.target.value)}
        className="w-full sm:w-48"
      />
      <Select
        options={[
          { value: 'createdAt', label: 'Data creazione' },
          { value: 'priority', label: 'Priorità' },
          { value: 'dueDate', label: 'Scadenza' },
        ]}
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        className="w-full sm:w-44"
      />
    </div>
  )
}
