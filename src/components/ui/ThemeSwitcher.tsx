'use client'
import { brandClient } from '@/lib/branding-client'

import { useState, useEffect, useRef } from 'react'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark'

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Chiaro', icon: Sun },
  { value: 'dark', label: 'Scuro', icon: Moon },
]

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(brandClient.storageKeys.theme)
  if (stored === 'light' || stored === 'dark') return stored
  return 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem(brandClient.storageKeys.theme, theme)
  document.cookie = `${brandClient.cookies.theme}=${theme};path=/;max-age=31536000;SameSite=Lax`
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>('light')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = getStoredTheme()
    setTheme(stored)
    applyTheme(stored)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectTheme(t: Theme) {
    setTheme(t)
    applyTheme(t)
    setOpen(false)
  }

  const CurrentIcon = THEMES.find((t) => t.value === theme)?.icon || Sun

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-secondary/60 transition-colors"
        title="Cambia tema"
      >
        <CurrentIcon className="h-[18px] w-[18px] text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-card rounded-lg border border-border shadow-[var(--shadow-lg)] z-50 py-1 animate-scale-in">
          {THEMES.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.value}
                onClick={() => selectTheme(t.value)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                  theme === t.value
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground hover:bg-secondary'
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
