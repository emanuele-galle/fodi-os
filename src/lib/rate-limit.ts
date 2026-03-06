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

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(key: string, maxAttempts: number = 5, windowMs: number = 60000): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxAttempts - 1, resetAt: Math.floor((now + windowMs) / 1000) }
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: Math.floor(entry.resetAt / 1000) }
  }

  entry.count++
  return { allowed: true, remaining: maxAttempts - entry.count, resetAt: Math.floor(entry.resetAt / 1000) }
}
