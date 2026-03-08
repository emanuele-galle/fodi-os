'use client'

import { useSyncExternalStore } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

const TABLET_QUERY = '(min-width: 768px)'
const DESKTOP_QUERY = '(min-width: 1024px)'

function getSnapshot(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop'
  if (window.matchMedia(DESKTOP_QUERY).matches) return 'desktop'
  if (window.matchMedia(TABLET_QUERY).matches) return 'tablet'
  return 'mobile'
}

function getServerSnapshot(): Breakpoint {
  return 'desktop'
}

function subscribe(callback: () => void): () => void {
  const tabletMql = window.matchMedia(TABLET_QUERY)
  const desktopMql = window.matchMedia(DESKTOP_QUERY)
  tabletMql.addEventListener('change', callback)
  desktopMql.addEventListener('change', callback)
  return () => {
    tabletMql.removeEventListener('change', callback)
    desktopMql.removeEventListener('change', callback)
  }
}

export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
