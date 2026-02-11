'use client'

import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { X, Check, Search } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'

export interface MultiUserSelectUser {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
}

export interface MultiUserSelectProps {
  users: MultiUserSelectUser[]
  selected: string[]
  onChange: (ids: string[]) => void
  label?: string
  placeholder?: string
  className?: string
}

export function MultiUserSelect({
  users,
  selected,
  onChange,
  label,
  placeholder = 'Seleziona utenti...',
  className,
}: MultiUserSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [focusIndex, setFocusIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedUsers = users.filter((u) => selected.includes(u.id))
  const filtered = users.filter((u) => {
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase()
    return fullName.includes(search.toLowerCase())
  })

  const toggle = useCallback(
    (id: string) => {
      if (selected.includes(id)) {
        onChange(selected.filter((s) => s !== id))
      } else {
        onChange([...selected, id])
      }
    },
    [selected, onChange]
  )

  const remove = useCallback(
    (id: string) => {
      onChange(selected.filter((s) => s !== id))
    },
    [selected, onChange]
  )

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
        setFocusIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Focus search when dropdown opens
  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus()
    }
  }, [open])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (focusIndex >= 0 && focusIndex < filtered.length) {
          toggle(filtered[focusIndex].id)
        }
        break
      case 'Escape':
        setOpen(false)
        setSearch('')
        setFocusIndex(-1)
        break
    }
  }

  // Scroll focused item into view
  useEffect(() => {
    if (focusIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-user-item]')
      items[focusIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusIndex])

  return (
    <div className={cn('space-y-1', className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-foreground">{label}</label>
      )}

      {/* Trigger / selected chips */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 border rounded-lg p-2 min-h-[44px] cursor-pointer transition-colors',
          open ? 'border-primary/50 ring-2 ring-primary/20' : 'border-border',
          'bg-background'
        )}
        onClick={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="combobox"
        aria-expanded={open}
      >
        {selectedUsers.map((user) => (
          <span
            key={user.id}
            className="inline-flex items-center gap-1 bg-primary/10 rounded-full px-2 py-1 text-sm"
          >
            <Avatar
              src={user.avatarUrl}
              name={`${user.firstName} ${user.lastName}`}
              size="xs"
              className="h-4 w-4 text-[8px]"
            />
            <span className="max-w-[120px] truncate">
              {user.firstName} {user.lastName}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                remove(user.id)
              }}
              className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {selectedUsers.length === 0 && (
          <span className="text-sm text-muted px-1">{placeholder}</span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="relative">
          <div className="absolute z-50 w-full border border-border rounded-lg shadow-[var(--shadow-lg)] bg-card animate-scale-in overflow-hidden">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <Search className="h-4 w-4 text-muted flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setFocusIndex(-1)
                }}
                onKeyDown={handleKeyDown}
                placeholder="Cerca..."
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted"
              />
            </div>

            {/* User list */}
            <div ref={listRef} className="max-h-[200px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted text-center">
                  Nessun utente trovato
                </div>
              ) : (
                filtered.map((user, i) => {
                  const isSelected = selected.includes(user.id)
                  const isFocused = focusIndex === i
                  return (
                    <button
                      key={user.id}
                      type="button"
                      data-user-item
                      onClick={() => toggle(user.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors min-h-[44px]',
                        isFocused ? 'bg-secondary' : 'hover:bg-secondary/60'
                      )}
                    >
                      <Avatar
                        src={user.avatarUrl}
                        name={`${user.firstName} ${user.lastName}`}
                        size="xs"
                      />
                      <span className="flex-1 text-left truncate">
                        {user.firstName} {user.lastName}
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
