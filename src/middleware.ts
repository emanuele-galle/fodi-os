import { brand } from '@/lib/branding'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getClientIp } from '@/lib/ip'

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/verify-ip', '/api/auth/', '/api/health', '/sign/', '/c/', '/api/c/', '/api/integrations/microsoft/authorize', '/api/integrations/microsoft/callback', '/api/integrations/microsoft/webhook']
const PORTAL_PATHS = ['/portal']

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p))
}

function isPortal(pathname: string): boolean {
  return PORTAL_PATHS.some(p => pathname.startsWith(p))
}

function isApi(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET)
    return payload as { sub: string; role: string; email: string; name?: string; customRoleId?: string | null }
  } catch {
    return null
  }
}

/**
 * Check if there's a plausible refresh token present (basic JWT format check).
 * The actual refresh (with DB revocation check + signature) happens via /api/auth/refresh.
 */
function hasValidRefreshToken(request: NextRequest): boolean {
  const refreshToken = request.cookies.get(brand.cookies.refresh)?.value
  if (!refreshToken) return false
  // Basic JWT format: three base64url segments separated by dots
  const parts = refreshToken.split('.')
  return parts.length === 3 && parts.every(p => p.length > 0)
}

const CSP_SCRIPT_SRC = process.env.NODE_ENV === 'production'
  ? "'self' 'unsafe-inline'"
  : "'self' 'unsafe-inline' 'unsafe-eval'"

// CSP domains derived from env vars — works for any brand (FODI OS, Muscari OS, etc.)
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
const siteOrigin = siteUrl ? new URL(siteUrl).origin : ''
const storageUrl = process.env.S3_PUBLIC_URL || process.env.BRAND_STORAGE_URL || ''
const storageOrigin = storageUrl ? new URL(storageUrl).origin : ''
const extraCspDomains = (process.env.CSP_CONNECT_EXTRA || '').split(',').map(s => s.trim()).filter(Boolean)

const CSP_CONNECT = [
  "'self'",
  ...(siteOrigin ? [siteOrigin, siteOrigin.replace('https://', 'wss://')] : []),
  ...(storageOrigin ? [storageOrigin] : []),
  ...extraCspDomains,
  'https://challenges.cloudflare.com',
  'https://apis.google.com', 'https://accounts.google.com',
  'https://*.googleusercontent.com', 'https://*.googleapis.com',
  'https://www.google-analytics.com', 'https://analytics.google.com',
  'https://www.googletagmanager.com',
].join(' ')

const CSP_MEDIA_SRC = storageOrigin ? `'self' blob: ${storageOrigin}` : "'self' blob:"

const CSP_HEADER = `default-src 'self'; script-src ${CSP_SCRIPT_SRC} https://challenges.cloudflare.com https://www.googletagmanager.com; script-src-elem ${CSP_SCRIPT_SRC} https://challenges.cloudflare.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src ${CSP_CONNECT}; frame-src 'self' https://meet.google.com https://accounts.google.com https://drive.google.com https://challenges.cloudflare.com; media-src ${CSP_MEDIA_SRC}; worker-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`

function setSecurityHeaders(response: NextResponse, isHtmlPage = false): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  // Prevent CDN/browser from caching HTML pages (fixes Cloudflare stale cache issues)
  if (isHtmlPage) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('CDN-Cache-Control', 'no-store')
    response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store')
  }
  response.headers.set('Content-Security-Policy', CSP_HEADER)
  return response
}

function buildUrl(request: NextRequest, path: string): URL {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  return new URL(path, `${proto}://${host}`)
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return setSecurityHeaders(NextResponse.next())
  }

  // Public paths - always allow (HTML pages, no CDN cache)
  if (isPublic(pathname)) {
    return setSecurityHeaders(NextResponse.next(), true)
  }

  // Portal paths - check access cookie with CLIENT role
  if (isPortal(pathname)) {
    const accessToken = request.cookies.get(brand.cookies.access)?.value
    if (!accessToken) {
      return setSecurityHeaders(NextResponse.redirect(buildUrl(request, '/login')), true)
    }
    const payload = await verifyToken(accessToken)
    if (!payload || payload.role !== 'CLIENT') {
      return setSecurityHeaders(NextResponse.redirect(buildUrl(request, '/login')), true)
    }
    const response = NextResponse.next()
    response.headers.set('x-user-id', payload.sub)
    response.headers.set('x-user-role', payload.role)
    return setSecurityHeaders(response, true)
  }

  // API paths - verify Bearer token or cookie, with auto-refresh
  if (isApi(pathname)) {
    // Allow POST /api/leads without auth (external webhooks)
    if (pathname === '/api/leads' && request.method === 'POST') {
      return setSecurityHeaders(NextResponse.next())
    }

    // Allow cron endpoints without JWT auth (they verify CRON_SECRET internally)
    if (request.method === 'POST' && (
      pathname === '/api/digest/send' ||
      pathname === '/api/tasks/check-deadlines' ||
      pathname === '/api/team/reports/generate' ||
      pathname === '/api/reminders/generate'
    )) {
      return setSecurityHeaders(NextResponse.next())
    }

    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const cookieToken = request.cookies.get(brand.cookies.access)?.value
    const token = bearerToken || cookieToken

    // Try to verify existing access token
    if (token) {
      const payload = await verifyToken(token)
      if (payload) {
        const response = NextResponse.next()
        let effectiveUserId = payload.sub
        const effectiveRole = payload.role

        // Impersonation: if admin has impersonate cookie, override user context.
        // Security decision: admin keeps ADMIN role during impersonation so they
        // retain full permissions (e.g. stop-impersonate). The impersonated user's
        // data is loaded via x-user-id, but permission checks use the real admin role.
        const impersonateId = request.cookies.get(brand.cookies.impersonate)?.value
        if (impersonateId && payload.role === 'ADMIN') {
          effectiveUserId = impersonateId
          response.headers.set('x-impersonating', 'true')
          response.headers.set('x-real-admin-id', payload.sub)
          response.headers.set('x-user-id', effectiveUserId)
          response.headers.set('x-user-role', payload.role) // intentionally keeps ADMIN role
          return setSecurityHeaders(response)
        }

        response.headers.set('x-user-id', effectiveUserId)
        response.headers.set('x-user-role', effectiveRole)
        if (payload.customRoleId) {
          response.headers.set('x-custom-role-id', payload.customRoleId)
        }
        // Pass client IP for tracking (Traefik sets x-forwarded-for)
        const clientIp = getClientIp(request)
        if (clientIp) response.headers.set('x-client-ip', clientIp)
        return setSecurityHeaders(response)
      }
    }

    // Access token expired/missing - redirect to refresh endpoint
    if (hasValidRefreshToken(request)) {
      return setSecurityHeaders(NextResponse.json({ error: 'Token expired', refresh: true }, { status: 401 }))
    }

    return setSecurityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
  }

  // Dashboard paths (everything else) - verify access cookie with auto-refresh
  const accessToken = request.cookies.get(brand.cookies.access)?.value

  // Try existing access token
  if (accessToken) {
    const payload = await verifyToken(accessToken)
    if (payload) {
      return setSecurityHeaders(NextResponse.next(), true)
    }
  }

  // Access token expired/missing - redirect to refresh endpoint via client
  if (hasValidRefreshToken(request)) {
    const refreshUrl = buildUrl(request, '/api/auth/refresh-redirect')
    refreshUrl.searchParams.set('returnTo', pathname)
    return setSecurityHeaders(NextResponse.redirect(refreshUrl), true)
  }

  // Both tokens invalid - redirect to login
  return setSecurityHeaders(NextResponse.redirect(buildUrl(request, '/login')), true)
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
}
