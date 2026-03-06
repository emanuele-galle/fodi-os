import { describe, it, expect } from 'vitest'
import { rateLimit } from '@/lib/rate-limit'

describe('Rate Limiter', () => {
  const uniqueKey = () => `test:${crypto.randomUUID()}`

  it('allows first request', () => {
    const result = rateLimit(uniqueKey(), 3, 1000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('decrements remaining on subsequent requests', () => {
    const key = uniqueKey()
    rateLimit(key, 3, 1000)
    const result = rateLimit(key, 3, 1000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(1)
  })

  it('blocks after max attempts', () => {
    const key = uniqueKey()
    rateLimit(key, 2, 60000)
    rateLimit(key, 2, 60000)
    const result = rateLimit(key, 2, 60000)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('returns resetAt as unix seconds', () => {
    const before = Math.floor(Date.now() / 1000)
    const result = rateLimit(uniqueKey(), 5, 60000)
    expect(result.resetAt).toBeGreaterThanOrEqual(before + 59)
    expect(result.resetAt).toBeLessThanOrEqual(before + 61)
  })

  it('resets after window expires', async () => {
    const key = uniqueKey()
    rateLimit(key, 1, 50)
    rateLimit(key, 1, 50) // blocked
    await new Promise((r) => setTimeout(r, 60))
    const result = rateLimit(key, 1, 50)
    expect(result.allowed).toBe(true)
  })
})

describe('Auth token constants', () => {
  it('ACCESS_COOKIE_MAX_AGE is 15 minutes', async () => {
    const { ACCESS_COOKIE_MAX_AGE } = await import('@/lib/auth')
    expect(ACCESS_COOKIE_MAX_AGE).toBe(15 * 60)
  })

  it('REFRESH_COOKIE_MAX_AGE is 90 days', async () => {
    const { REFRESH_COOKIE_MAX_AGE } = await import('@/lib/auth')
    expect(REFRESH_COOKIE_MAX_AGE).toBe(90 * 24 * 60 * 60)
  })
})
