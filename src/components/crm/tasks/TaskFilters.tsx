'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { TASK_STATUS_OPTIONS, PRIORITY_OPTIONS, type Client } from './types'

interface TaskFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  priorityFilter: string
  onPriorityFilterChange: (value: string) => void
  clientFilter: string
  onClientFilterChange: (value: string) => void
  clients: Client[]
  total: number
}

export function TaskFilters({
  search, onSearchChange,
  statusFilter, onStatusFilterChange,
  priorityFilter, onPriorityFilterChange,
  clientFilter, onClientFilterChange,
  clients, total,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <Input
          placeholder="Cerca per titolo, descrizione, cliente..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          options={TASK_STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="w-44"
        />
        <Select
          options={PRIORITY_OPTIONS}
          value={priorityFilter}
          onChange={(e) => onPriorityFilterChange(e.target.value)}
          className="w-44"
        />
        <Select
          options={[
            { value: '', label: 'Tutti i clienti' },
            ...clients.map(c => ({ value: c.id, label: c.companyName }))
          ]}
          value={clientFilter}
          onChange={(e) => onClientFilterChange(e.target.value)}
          className="w-48"
        />
        <span className="text-sm text-muted whitespace-nowrap">{total} totali</span>
      </div>
    </div>
  )
}
