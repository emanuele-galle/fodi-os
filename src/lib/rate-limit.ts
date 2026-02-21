// NOTE: In-memory rate limiter — state is per-process and not shared across
// multiple instances/workers. Sufficient for single-container deployments.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

// Cleanup expired entries every 5 minutes to prevent memory leak
const cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}, 5 * 60 * 1000)
cleanupTimer.unref()

export function rateLimit(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxAttempts) {
    return false
  }

  entry.count++
  return true
}
