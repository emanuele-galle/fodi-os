'use client'

import { useState, useEffect } from 'react'
import { ThemeSwitcher as AppleThemeSwitcher } from './apple-liquid-glass-switcher'

type FodiTheme = 'light' | 'dark' | 'midnight'
type AppleTheme = 'light' | 'dark' | 'dim'

const fodiToApple: Record<FodiTheme, AppleTheme> = {
  light: 'light',
  dark: 'dark',
  midnight: 'dim',
}

const appleToFodi: Record<AppleTheme, FodiTheme> = {
  light: 'light',
  dark: 'dark',
  dim: 'midnight',
}

function getStoredTheme(): FodiTheme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem('fodi-theme')
  if (stored === 'light' || stored === 'dark' || stored === 'midnight') return stored
  return 'light'
}

function applyTheme(theme: FodiTheme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('fodi-theme', theme)
  document.cookie = `fodi-theme=${theme};path=/;max-age=31536000;SameSite=Lax`
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<FodiTheme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = getStoredTheme()
    setTheme(stored)
    applyTheme(stored)
    setMounted(true)
  }, [])

  function handleChange(appleTheme: AppleTheme) {
    const fodiTheme = appleToFodi[appleTheme]
    setTheme(fodiTheme)
    applyTheme(fodiTheme)
  }

  if (!mounted) return null

  return (
    <AppleThemeSwitcher
      value={fodiToApple[theme]}
      onValueChange={handleChange}
    />
  )
}
