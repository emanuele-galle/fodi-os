'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { BottomNav } from '@/components/layout/BottomNav'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { IncomingCallBanner } from '@/components/layout/IncomingCallBanner'
import { MobileNotificationsPanel } from '@/components/layout/MobileNotificationsPanel'
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner'
import { SetupBanner } from '@/components/layout/SetupBanner'
import { ActiveTimerBanner } from '@/components/tasks/ActiveTimerBanner'
import { useState, useEffect, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { SSEProvider } from '@/providers/SSEProvider'
import { useSSE } from '@/hooks/useSSE'

const CommandPalette = dynamic(() => import('@/components/layout/CommandPalette').then(m => ({ default: m.CommandPalette })), {
  ssr: false,
})
const PwaInstallPrompt = dynamic(() => import('@/components/layout/PwaInstallPrompt').then(m => ({ default: m.PwaInstallPrompt })), {
  ssr: false,
})
const AiChatSidebar = dynamic(() => import('@/components/ai/AiChatSidebar').then(m => ({ default: m.AiChatSidebar })), {
  ssr: false,
})
const OnboardingWizard = dynamic(() => import('@/components/layout/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })), { ssr: false })
import { useAuthRefresh } from '@/hooks/useAuthRefresh'
import type { Role } from '@/generated/prisma/client'
import type { SectionAccessMap } from '@/lib/section-access'

interface UserSession {
  id: string
  firstName: string
  lastName: string
  email: string
  role: Role
  customRoleId?: string | null
  customRole?: {
    id: string
    name: string
    color: string | null
    modulePermissions: Record<string, string[]>
    sectionAccess: SectionAccessMap
    baseRole: Role
  } | null
  avatarUrl?: string | null
  sectionAccess?: SectionAccessMap | null
  isImpersonating?: boolean
  realAdmin?: { id: string; name: string } | null
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<UserSession | null>(null)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadChat, setUnreadChat] = useState(0)
  const [pendingTaskCount, setPendingTaskCount] = useState(0)

  const [showOnboarding, setShowOnboarding] = useState(false)
  const [mobileNotificationsOpen, setMobileNotificationsOpen] = useState(false)
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false)
  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), [])
  const toggleAiSidebar = useCallback(() => setAiSidebarOpen(prev => !prev), [])
  const openMobileNotifications = useCallback(() => setMobileNotificationsOpen(true), [])

  // Proactive token refresh: prevents auto-logout
  useAuthRefresh()

  useEffect(() => {
    let cancelled = false
    let retried = false

    async function loadSession() {
      const res = await fetch('/api/auth/session')

      if (cancelled) return

      if (res.ok) {
        const data = await res.json()
        if (data?.user) {
          setUser(data.user)
          fetch('/api/onboarding')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (!cancelled && data && !data.completed) setShowOnboarding(true)
            })
            .catch(() => {})
          return
        }
      }

      // 401: access token expired — attempt refresh then retry
      if (res.status === 401 && !retried) {
        retried = true
        try {
          const { refreshAccessToken } = await import('@/hooks/useAuthRefresh')
          const ok = await refreshAccessToken()
          if (ok && !cancelled) return loadSession()
        } catch { /* refresh failed */ }
      }

      if (!cancelled) window.location.href = '/login'
    }
    loadSession()
    return () => { cancelled = true }
  }, [])

  // Fetch unread counts - initial load + fallback polling every 120s (SSE handles real-time)
  const fetchCounts = useCallback(() => {
    if (document.hidden) return
    fetch('/api/notifications?limit=1')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.unreadCount !== undefined) {
          setUnreadNotifications(data.unreadCount)
          if ('setAppBadge' in navigator) {
            if (data.unreadCount > 0) {
              navigator.setAppBadge(data.unreadCount).catch(() => {})
            } else {
              navigator.clearAppBadge?.().catch(() => {})
            }
          }
        }
      })
      .catch(() => {})

    fetch('/api/chat/channels')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const channels = data?.items || []
        setUnreadChat(channels.reduce((sum: number, c: { unreadCount?: number }) => sum + (c.unreadCount || 0), 0))
      })
      .catch(() => {})

    fetch('/api/tasks/count')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.count !== undefined) setPendingTaskCount(data.count)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchCounts()
    const interval = setInterval(fetchCounts, 120000) // 120s fallback
    return () => clearInterval(interval)
  }, [fetchCounts])

  // Heartbeat: update lastActiveAt every 60s, pause when tab hidden
  useEffect(() => {
    function sendHeartbeat() {
      if (document.hidden) return
      fetch('/api/heartbeat', { method: 'POST' }).catch(() => {})
    }
    sendHeartbeat()
    const interval = setInterval(sendHeartbeat, 60000)
    return () => clearInterval(interval)
  }, [])

  // Global Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/20 shimmer" />
        <div className="text-sm text-muted animate-pulse">Caricamento...</div>
      </div>
    )
  }

  return (
    <SSEProvider>
    <BadgeUpdater
      setUnreadNotifications={setUnreadNotifications}
      setUnreadChat={setUnreadChat}
      setPendingTaskCount={setPendingTaskCount}
    />
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar: hidden on mobile, visible on md+ */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar userRole={user.role} sectionAccess={user.sectionAccess} customRoleSectionAccess={user.customRole?.sectionAccess as SectionAccessMap | null | undefined} unreadChat={unreadChat} pendingTaskCount={pendingTaskCount} unreadNotifications={unreadNotifications} />
      </div>

      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-x-hidden">
        {/* Impersonation banner */}
        {user.isImpersonating && (
          <ImpersonationBanner
            userName={`${user.firstName} ${user.lastName}`}
            onExit={() => setUser(null)}
          />
        )}

        {/* MobileHeader: visible only on mobile */}
        <MobileHeader
          user={user}
          unreadCount={unreadNotifications}
          onOpenSearch={openCommandPalette}
          onOpenNotifications={openMobileNotifications}
        />

        {/* Topbar: hidden on mobile, visible on md+ */}
        <div className="hidden md:block relative z-40">
          <Topbar
            user={user}
            onOpenCommandPalette={openCommandPalette}
            onToggleAiSidebar={toggleAiSidebar}
          />
        </div>

        <SetupBanner />
        <ActiveTimerBanner />

        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6 [&>*]:max-w-[1400px] [&>*]:mx-auto">
          <Suspense fallback={
            <div className="animate-fade-in space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl shimmer" />
                <div className="space-y-2">
                  <div className="h-6 w-48 rounded-md shimmer" />
                  <div className="h-4 w-64 rounded-md shimmer" />
                </div>
              </div>
              <div className="h-12 w-full rounded-lg shimmer" />
              <div className="space-y-3">
                <div className="h-14 w-full rounded-lg shimmer" />
                <div className="h-14 w-full rounded-lg shimmer" />
                <div className="h-14 w-full rounded-lg shimmer" />
                <div className="h-14 w-full rounded-lg shimmer" />
                <div className="h-14 w-full rounded-lg shimmer" />
              </div>
            </div>
          }>
            {children}
          </Suspense>
        </main>
      </div>

      {/* BottomNav: visible only on mobile */}
      <BottomNav userRole={user.role} sectionAccess={user.sectionAccess} customRoleSectionAccess={user.customRole?.sectionAccess as SectionAccessMap | null | undefined} unreadChat={unreadChat} />

      {commandPaletteOpen && (
        <CommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
        />
      )}

      {/* Mobile Notifications Panel */}
      {mobileNotificationsOpen && (
        <MobileNotificationsPanel
          onClose={() => setMobileNotificationsOpen(false)}
        />
      )}

      <IncomingCallBanner />
      {showOnboarding && user && (
        <OnboardingWizard
          user={{ firstName: user.firstName, role: user.role }}
          onComplete={() => setShowOnboarding(false)}
        />
      )}
      <PwaInstallPrompt />
      <AiChatSidebar open={aiSidebarOpen} onClose={() => setAiSidebarOpen(false)} />
    </div>
    </SSEProvider>
  )
}

function BadgeUpdater({
  setUnreadNotifications,
  setUnreadChat,
  setPendingTaskCount,
}: {
  setUnreadNotifications: (n: number) => void
  setUnreadChat: (n: number) => void
  setPendingTaskCount: (n: number) => void
}) {
  useSSE(useCallback((event) => {
    if (event.type === 'badge_update') {
      const badge = event.data as { notifications?: number; chat?: number; tasks?: number }
      if (badge.notifications !== undefined) {
        setUnreadNotifications(badge.notifications)
        if ('setAppBadge' in navigator) {
          if (badge.notifications > 0) {
            navigator.setAppBadge(badge.notifications).catch(() => {})
          } else {
            navigator.clearAppBadge?.().catch(() => {})
          }
        }
      }
      if (badge.chat !== undefined) setUnreadChat(badge.chat)
      if (badge.tasks !== undefined) setPendingTaskCount(badge.tasks)
    }
  }, [setUnreadNotifications, setUnreadChat, setPendingTaskCount]))

  return null
}
