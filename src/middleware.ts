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
    return payload as { sub: string; role: string; email: string }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // Public paths - always allow
  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  // Portal paths - check portal cookie
  if (isPortal(pathname)) {
    const portalToken = request.cookies.get('fodi_portal')?.value
    if (!portalToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const payload = await verifyToken(portalToken)
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // API paths - verify Bearer token or cookie
  if (isApi(pathname)) {
    // Allow POST /api/leads without auth (external webhooks)
    if (pathname === '/api/leads' && request.method === 'POST') {
      return NextResponse.next()
    }

    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const cookieToken = request.cookies.get('fodi_access')?.value
    const token = bearerToken || cookieToken

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Token expired or invalid' }, { status: 401 })
    }

    const response = NextResponse.next()
    response.headers.set('x-user-id', payload.sub)
    response.headers.set('x-user-role', payload.role)
    return response
  }

  // Dashboard paths (everything else) - verify access cookie
  const accessToken = request.cookies.get('fodi_access')?.value
  if (!accessToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const payload = await verifyToken(accessToken)
  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
}
