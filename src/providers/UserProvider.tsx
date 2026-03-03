'use client'

import { createContext, useContext } from 'react'
import type { Role } from '@/generated/prisma/client'
import type { SectionAccessMap } from '@/lib/section-access'

interface CurrentUser {
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

const UserContext = createContext<CurrentUser | null>(null)

export function UserProvider({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

export function useCurrentUser(): CurrentUser | null {
  return useContext(UserContext)
}
