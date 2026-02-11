'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'midnight'

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Chiaro', icon: Sun },
  { value: 'dark', label: 'Scuro', icon: Moon },
  { value: 'midnight', label: 'Mezzanotte', icon: Sparkles },
]

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem('fodi-theme')
  if (stored === 'light' || stored === 'dark' || stored === 'midnight') return stored
  return 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('fodi-theme', theme)
  document.cookie = `fodi-theme=${theme};path=/;max-age=31536000;SameSite=Lax`
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>('light')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const stored = getStoredTheme()
    setTheme(stored)
    applyTheme(stored)
  }, [])

  function selectTheme(t: Theme) {
    setTheme(t)
    applyTheme(t)
    setOpen(false)
  }

  const CurrentIcon = THEMES.find((t) => t.value === theme)?.icon || Sun

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-md hover:bg-secondary transition-colors"
        title="Cambia tema"
      >
        <CurrentIcon className="h-5 w-5 text-muted" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-40 bg-card rounded-lg border border-border shadow-lg z-50 py-1 animate-scale-in">
            {THEMES.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.value}
                  onClick={() => selectTheme(t.value)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                    theme === t.value
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-secondary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
