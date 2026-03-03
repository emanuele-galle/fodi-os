const cache = new Map<string, { data: unknown; expiresAt: number }>()

export function invalidateCustomRoleCache(customRoleId?: string) {
  if (customRoleId) {
    cache.delete(customRoleId)
  } else {
    cache.clear()
  }
}
