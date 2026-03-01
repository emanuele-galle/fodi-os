'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Enables native View Transitions API for page navigations.
 * Falls back gracefully on unsupported browsers.
 */
export function useViewTransition() {
  const pathname = usePathname()

  useEffect(() => {
    // Intercept Next.js client-side navigations via popstate
    // The actual transition is triggered by CSS @view-transition
    if (!('startViewTransition' in document)) return

    // Add view-transition-name to main content for cross-fade
    const main = document.querySelector('main')
    if (main) {
      main.style.viewTransitionName = 'main-content'
    }
  }, [pathname])
}
