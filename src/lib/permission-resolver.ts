import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'
import type { Module, Permission } from '@/lib/permissions'
import type { SectionAccessMap } from '@/lib/section-access'

interface ResolvedPermissions {
  modulePermissions: Record<string, string[]> | null
  sectionAccess: SectionAccessMap | null
  baseRole: Role
}

// Simple LRU-ish cache with TTL
const cache = new Map<string, { data: ResolvedPermissions; expiresAt: number }>()
const CACHE_TTL = 60_000 // 60 seconds
const MAX_CACHE_SIZE = 200

export function invalidateCustomRoleCache(customRoleId?: string) {
  if (customRoleId) {
    cache.delete(customRoleId)
  } else {
    cache.clear()
  }
}

async function resolvePermissions(
  role: Role,
  customRoleId: string | null | undefined
): Promise<ResolvedPermissions> {
  if (!customRoleId) {
    return { modulePermissions: null, sectionAccess: null, baseRole: role }
  }

  const now = Date.now()
  const cached = cache.get(customRoleId)
  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  const customRole = await prisma.customRole.findUnique({
    where: { id: customRoleId },
    select: {
      baseRole: true,
      modulePermissions: true,
      sectionAccess: true,
      isActive: true,
    },
  })

  if (!customRole || !customRole.isActive) {
    return { modulePermissions: null, sectionAccess: null, baseRole: role }
  }

  const resolved: ResolvedPermissions = {
    modulePermissions: customRole.modulePermissions as Record<string, string[]> | null,
    sectionAccess: customRole.sectionAccess as SectionAccessMap | null,
    baseRole: customRole.baseRole,
  }

  // Evict oldest if over size
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value
    if (firstKey) cache.delete(firstKey)
  }

  cache.set(customRoleId, { data: resolved, expiresAt: now + CACHE_TTL })
  return resolved
}
