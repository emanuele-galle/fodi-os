import { NextRequest } from 'next/server'

/**
 * Extract the real client IP from a NextRequest.
 *
 * Priority:
 * 1. cf-connecting-ip  – set by Cloudflare with the real visitor IP
 * 2. x-forwarded-for   – first IP in the comma-separated list (set by proxies)
 * 3. x-real-ip         – fallback header set by some reverse proxies
 * 4. 'unknown'         – when no header is available
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
