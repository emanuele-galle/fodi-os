import { NextResponse } from 'next/server'

/**
 * Create a cached JSON response with appropriate Cache-Control headers.
 * Use for read-only endpoints to reduce redundant requests.
 *
 * Presets:
 * - "static": rarely changes (vat rates, categories) — 1h cache, 24h stale
 * - "semi-static": changes occasionally (team list, projects) — 60s cache, 5min stale
 * - "short": changes frequently but tolerates brief caching — 10s cache, 30s stale
 */
type CachePreset = 'static' | 'semi-static' | 'short'

const PRESETS: Record<CachePreset, string> = {
  static: 'private, max-age=3600, stale-while-revalidate=86400',
  'semi-static': 'private, max-age=60, stale-while-revalidate=300',
  short: 'private, max-age=10, stale-while-revalidate=30',
}

export function cachedJson(data: unknown, preset: CachePreset, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': PRESETS[preset] },
  })
}
