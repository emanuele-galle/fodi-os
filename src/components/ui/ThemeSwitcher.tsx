'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop -- event handlers */
import { brandClient } from '@/lib/branding-client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

type ThemePreference = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Chiaro', icon: Sun },
  { value: 'dark', label: 'Scuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#F2F2F7',
  dark: '#000000',
}

function getStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(brandClient.storageKeys.theme)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'light'
}

function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return pref
}

function applyResolved(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', resolved)
  const meta = document.getElementById('theme-color-meta')
  if (meta) meta.setAttribute('content', THEME_COLORS[resolved])
}

function persistPreference(pref: ThemePreference) {
  localStorage.setItem(brandClient.storageKeys.theme, pref)
  document.cookie = `${brandClient.cookies.theme}=${pref};path=/;max-age=31536000;SameSite=Lax`
}

export function ThemeSwitcher() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = getStoredTheme()
    applyResolved(resolveTheme(stored))
    return stored
  })
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Listen for system theme changes when preference is 'system'
  useEffect(() => {
    if (preference !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      applyResolved(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preference])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectTheme = useCallback((t: ThemePreference) => {
    setPreference(t)
    applyResolved(resolveTheme(t))
    persistPreference(t)
    setOpen(false)
  }, [])

  const CurrentIcon = THEMES.find((t) => t.value === preference)?.icon || Sun

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
        <div className="absolute right-0 mt-2 w-40 bg-card rounded-xl border border-border shadow-[var(--shadow-lg)] z-50 py-1 animate-scale-in">
          {THEMES.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.value}
                onClick={() => selectTheme(t.value)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                  preference === t.value
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
