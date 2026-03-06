'use client'

import { useState, useRef, useEffect, useMemo, useId } from 'react'
import { cn } from '@/lib/utils'
import { Search, ChevronDown, X } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface SearchableSelectProps {
  label?: string
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  required?: boolean
}

export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Seleziona...',
  error,
  disabled,
  required,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const generatedId = useId()

  const selectedLabel = options.find((o) => o.value === value)?.label || ''

  const MAX_VISIBLE = 50

  const filtered = useMemo(
    () =>
      search
        ? options.filter((o) =>
            o.label.toLowerCase().includes(search.toLowerCase())
          )
        : options,
    [search, options]
  )

  const visible = filtered.slice(0, MAX_VISIBLE)
  const hasMore = filtered.length > MAX_VISIBLE

  function handleSelect(val: string) {
    onChange(val)
    setOpen(false)
    setSearch('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setSearch('')
  }

  function handleToggleOpen() {
    if (!disabled) setOpen(!open)
  }

  function handleClearKeyDown() {
    // intentional no-op for a11y
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false)
      setSearch('')
    } else if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault()
      handleSelect(filtered[0].value)
    }
  }

  function handleOptionClick(val: string) {
    return function () {
      handleSelect(val)
    }
  }

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Focus input when opening
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const errorId = `${generatedId}-error`

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={handleToggleOpen}
          disabled={disabled}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'flex h-11 md:h-10 w-full items-center justify-between rounded-[10px] border bg-card px-3 py-2 text-base md:text-sm transition-all shadow-[var(--shadow-sm)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40',
            error ? 'border-destructive' : 'border-border/40',
            disabled && 'opacity-50 cursor-not-allowed',
            !value && 'text-muted'
          )}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <span className="flex items-center gap-1 flex-shrink-0 ml-2">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                onClick={handleClear}
                onKeyDown={handleClearKeyDown}
                className="p-0.5 rounded hover:bg-secondary/50 text-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted transition-transform',
                open && 'rotate-180'
              )}
            />
          </span>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-border/40 bg-card shadow-lg animate-fade-in">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
              <Search className="h-4 w-4 text-muted flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                placeholder="Cerca..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
              />
              {search && (
                <span className="text-xs text-muted">{filtered.length}</span>
              )}
            </div>
            <ul
              ref={listRef}
              className="max-h-56 overflow-y-auto py-1"
              role="listbox"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-muted text-center">
                  Nessun risultato
                </li>
              ) : (
                <>
                  {visible.map((opt) => (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={opt.value === value}
                      onClick={handleOptionClick(opt.value)}
                      className={cn(
                        'px-3 py-2 text-sm cursor-pointer transition-colors',
                        opt.value === value
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-secondary/50'
                      )}
                    >
                      {opt.label}
                    </li>
                  ))}
                  {hasMore && (
                    <li className="px-3 py-2 text-xs text-muted text-center border-t border-border/30">
                      +{filtered.length - MAX_VISIBLE} altri — digita per filtrare
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
