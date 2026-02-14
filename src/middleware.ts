import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

const PUBLIC_PATHS = ['/login', '/forgot-password', '/api/auth/', '/api/health']
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

function setSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://apis.google.com https://accounts.google.com https://*.googleusercontent.com https://*.googleapis.com; frame-src 'self' https://meet.google.com https://accounts.google.com https://drive.google.com; worker-src 'self';")
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return setSecurityHeaders(NextResponse.next())
  }

  // Public paths - always allow
  if (isPublic(pathname)) {
    return setSecurityHeaders(NextResponse.next())
  }

  // Portal paths - check portal cookie
  if (isPortal(pathname)) {
    const portalToken = request.cookies.get('fodi_portal')?.value
    if (!portalToken) {
      return setSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)))
    }
    const payload = await verifyToken(portalToken)
    if (!payload) {
      return setSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)))
    }
    return setSecurityHeaders(NextResponse.next())
  }

  // API paths - verify Bearer token or cookie, with auto-refresh
  if (isApi(pathname)) {
    // Allow POST /api/leads without auth (external webhooks)
    if (pathname === '/api/leads' && request.method === 'POST') {
      return setSecurityHeaders(NextResponse.next())
    }
    // Allow N8N webhooks without auth (specific path only)
    if (pathname === '/api/webhooks/n8n') {
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
        response.headers.set('x-user-id', payload.sub)
        response.headers.set('x-user-role', payload.role)
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
      return setSecurityHeaders(NextResponse.next())
    }
  }

  // Access token expired/missing - redirect to refresh endpoint via client
  if (hasValidRefreshToken(request)) {
    const refreshUrl = new URL('/api/auth/refresh-redirect', request.url)
    refreshUrl.searchParams.set('returnTo', pathname)
    return setSecurityHeaders(NextResponse.redirect(refreshUrl))
  }

  // Both tokens invalid - redirect to login
  return setSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)))
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
}
