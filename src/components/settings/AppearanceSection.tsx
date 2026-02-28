'use client'

import { useState, useEffect } from 'react'
import { brandClient } from '@/lib/branding-client'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark'

const THEMES: { value: Theme; label: string; icon: typeof Sun; description: string }[] = [
  { value: 'light', label: 'Chiaro', icon: Sun, description: 'Interfaccia luminosa per ambienti ben illuminati' },
  { value: 'dark', label: 'Scuro', icon: Moon, description: 'Riduce l\'affaticamento degli occhi in ambienti bui' },
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

export function AppearanceSection() {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light'
    return getStoredTheme()
  })

  function selectTheme(theme: Theme) {
    setCurrentTheme(theme)
    applyTheme(theme)
  }

  return (
    <Card>
      <CardTitle>Tema</CardTitle>
      <CardContent>
        <p className="text-sm text-muted mb-4">Scegli il tema che preferisci per l&apos;interfaccia.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {THEMES.map((t) => {
            const Icon = t.icon
            const isActive = currentTheme === t.value
            return (
              <button
                key={t.value}
                onClick={() => selectTheme(t.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center touch-manipulation min-h-[88px]',
                  isActive
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'border-border/50 hover:border-primary/30 hover:bg-secondary/30'
                )}
              >
                <div className={cn(
                  'p-3 rounded-full',
                  isActive ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted'
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={cn('text-sm font-medium', isActive ? 'text-primary' : 'text-foreground')}>
                  {t.label}
                </span>
                <span className="text-[11px] text-muted leading-tight">{t.description}</span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
