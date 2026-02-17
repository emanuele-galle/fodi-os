import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

const PUBLIC_PATHS = ['/login', '/forgot-password', '/verify-ip', '/api/auth/', '/api/health', '/sign/', '/c/', '/api/c/']
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
    return payload as { sub: string; role: string; email: string; name?: string }
  } catch {
    return null
  }
}

/**
 * Check if there's a valid refresh token present (JWT signature only).
 * The actual refresh (with DB revocation check) happens via /api/auth/refresh.
 */
function hasValidRefreshToken(request: NextRequest): boolean {
  const refreshToken = request.cookies.get('fodi_refresh')?.value
  return !!refreshToken
}

function setSecurityHeaders(response: NextResponse, isHtmlPage = false): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
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
  // CSP: unsafe-eval only in dev (Next.js HMR needs it), strict in production
  const scriptSrc = process.env.NODE_ENV === 'production'
    ? "'self' 'unsafe-inline'"
    : "'self' 'unsafe-inline' 'unsafe-eval'"
  response.headers.set('Content-Security-Policy', `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://apis.google.com https://accounts.google.com https://*.googleusercontent.com https://*.googleapis.com; frame-src 'self' https://meet.google.com https://accounts.google.com https://drive.google.com; media-src 'self' blob:; worker-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`)
  return response
}

function buildUrl(request: NextRequest, path: string): URL {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  return new URL(path, `${proto}://${host}`)
}

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

  // Portal paths - check portal cookie
  if (isPortal(pathname)) {
    const portalToken = request.cookies.get('fodi_portal')?.value
    if (!portalToken) {
      return setSecurityHeaders(NextResponse.redirect(buildUrl(request, '/login')), true)
    }
    const payload = await verifyToken(portalToken)
    if (!payload) {
      return setSecurityHeaders(NextResponse.redirect(buildUrl(request, '/login')), true)
    }
    return setSecurityHeaders(NextResponse.next(), true)
  }

  // API paths - verify Bearer token or cookie, with auto-refresh
  if (isApi(pathname)) {
    // Allow POST /api/leads without auth (external webhooks)
    if (pathname === '/api/leads' && request.method === 'POST') {
      return setSecurityHeaders(NextResponse.next())
    }

    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const cookieToken = request.cookies.get('fodi_access')?.value
    const token = bearerToken || cookieToken

    // Try to verify existing access token
    if (token) {
      const payload = await verifyToken(token)
      if (payload) {
        const response = NextResponse.next()
        let effectiveUserId = payload.sub
        let effectiveRole = payload.role

        // Impersonation: if admin has fodi_impersonate cookie, override user context
        const impersonateId = request.cookies.get('fodi_impersonate')?.value
        if (impersonateId && payload.role === 'ADMIN') {
          effectiveUserId = impersonateId
          // Role will be resolved by the session endpoint; set a marker
          response.headers.set('x-impersonating', 'true')
          response.headers.set('x-real-admin-id', payload.sub)
          // We don't know the target role here (no DB access in middleware),
          // so we pass the impersonated userId and let API routes handle it
          response.headers.set('x-user-id', effectiveUserId)
          response.headers.set('x-user-role', payload.role) // keep admin role for permission checks
          return setSecurityHeaders(response)
        }

        response.headers.set('x-user-id', effectiveUserId)
        response.headers.set('x-user-role', effectiveRole)
        // Pass client IP for tracking (Traefik sets x-forwarded-for)
        const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || request.headers.get('x-real-ip')
          || ''
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
  const accessToken = request.cookies.get('fodi_access')?.value

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
