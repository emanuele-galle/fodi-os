'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop -- event handlers */

import { cn } from '@/lib/utils'

interface Column<T> {
  key: string
  label: string
  /** Render cell content */
  render: (item: T) => React.ReactNode
  /** Hide this column on mobile card view */
  hideOnMobile?: boolean
  /** Show as primary field in mobile card (first line, bold) */
  primary?: boolean
  /** Show as secondary field in mobile card (subtitle) */
  secondary?: boolean
  /** Column header className */
  headerClassName?: string
  /** Cell className */
  cellClassName?: string
}

interface ResponsiveTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (item: T) => string
  onRowClick?: (item: T) => void
  emptyMessage?: string
  className?: string
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = 'Nessun elemento trovato',
  className,
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted text-sm">{emptyMessage}</div>
    )
  }

  const primaryCol = columns.find(c => c.primary)
  const secondaryCol = columns.find(c => c.secondary)
  const detailCols = columns.filter(c => !c.primary && !c.secondary && !c.hideOnMobile)

  return (
    <div className={className}>
      {/* Desktop: Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    'text-left text-xs font-semibold text-muted uppercase tracking-wider px-3 py-2.5',
                    col.headerClassName
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  'border-b border-border/20 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-secondary/50'
                )}
              >
                {columns.map(col => (
                  <td key={col.key} className={cn('px-3 py-3', col.cellClassName)}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: iOS grouped list */}
      <div className="md:hidden ios-grouped-section">
        {data.map((item, idx) => (
          <div
            key={keyExtractor(item)}
            onClick={() => onRowClick?.(item)}
            className={cn(
              'ios-grouped-row',
              onRowClick && 'cursor-pointer touch-manipulation',
              idx === data.length - 1 && '!border-b-0'
            )}
          >
            <div className="flex-1 min-w-0">
              {/* Primary + Secondary */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {primaryCol && (
                    <p className="text-[15px] font-medium truncate">{primaryCol.render(item)}</p>
                  )}
                  {secondaryCol && (
                    <p className="text-[12px] text-muted truncate mt-0.5">{secondaryCol.render(item)}</p>
                  )}
                </div>
                {/* Show last detail column as a badge on the right */}
                {detailCols.length > 0 && (
                  <div className="flex-shrink-0">
                    {detailCols[detailCols.length - 1].render(item)}
                  </div>
                )}
              </div>

              {/* Detail columns as inline tags */}
              {detailCols.length > 1 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                  {detailCols.slice(0, -1).map(col => (
                    <div key={col.key} className="flex items-center gap-1 text-[12px] text-muted">
                      <span className="font-medium text-foreground/70">{col.label}:</span>
                      <span>{col.render(item)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
