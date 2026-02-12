import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const REFRESH_SECRET = new TextEncoder().encode(process.env.REFRESH_SECRET!)

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

async function verifyRefresh(token: string) {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET)
    return payload as { sub: string; role: string; email: string; name?: string }
  } catch {
    return null
  }
}

async function createNewAccessToken(payload: { sub: string; email: string; name?: string; role: string }): Promise<string> {
  return new SignJWT({ ...payload, type: 'access' as const })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(ACCESS_SECRET)
}

/**
 * Try to refresh the access token using the refresh token cookie.
 * Returns the new access token + user payload, or null if refresh fails.
 * Note: This only verifies the JWT signature in the middleware (edge runtime).
 * The DB check for revoked tokens happens on the actual API call.
 */
async function tryRefreshAccess(request: NextRequest): Promise<{ token: string; payload: { sub: string; role: string; email: string; name?: string } } | null> {
  const refreshToken = request.cookies.get('fodi_refresh')?.value
  if (!refreshToken) return null

  const refreshPayload = await verifyRefresh(refreshToken)
  if (!refreshPayload) return null

  const newAccessToken = await createNewAccessToken({
    sub: refreshPayload.sub,
    email: refreshPayload.email,
    name: refreshPayload.name,
    role: refreshPayload.role,
  })

  return { token: newAccessToken, payload: refreshPayload }
}

function setAccessCookie(response: NextResponse, token: string): void {
  response.cookies.set('fodi_access', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  })
}

function setSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://apis.google.com https://accounts.google.com; frame-src 'self' https://meet.google.com https://accounts.google.com;")
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

    // Access token expired/missing - try refresh
    const refreshResult = await tryRefreshAccess(request)
    if (refreshResult) {
      const response = NextResponse.next()
      response.headers.set('x-user-id', refreshResult.payload.sub)
      response.headers.set('x-user-role', refreshResult.payload.role)
      setAccessCookie(response, refreshResult.token)
      return setSecurityHeaders(response)
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

  // Access token expired/missing - try refresh
  const refreshResult = await tryRefreshAccess(request)
  if (refreshResult) {
    const response = NextResponse.next()
    setAccessCookie(response, refreshResult.token)
    return setSecurityHeaders(response)
  }

  // Both tokens invalid - redirect to login
  return setSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)))
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
}
