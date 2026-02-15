'use client'

import { cn } from '@/lib/utils'

interface Category {
  id: string
  name: string
  icon: string | null
  type: string
  _count: { courses: number }
}

interface CategoryFilterProps {
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function CategoryFilter({ categories, selectedId, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
          selectedId === null
            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
            : 'bg-secondary/60 text-muted border-border/40 hover:text-foreground hover:bg-secondary'
        )}
      >
        Tutti
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
            selectedId === cat.id
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-secondary/60 text-muted border-border/40 hover:text-foreground hover:bg-secondary'
          )}
        >
          {cat.icon && <span>{cat.icon}</span>}
          <span>{cat.name}</span>
          <span className="text-xs opacity-70">({cat._count.courses})</span>
        </button>
      ))}
    </div>
  )
}
