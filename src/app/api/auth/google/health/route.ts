import { brand } from '@/lib/branding'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { getAuthenticatedClient, getDriveService } from '@/lib/google'
import type { Role } from '@/generated/prisma/client'

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

/**
 * GET /api/auth/google/health
 * Returns the health status of the admin's Google Drive connection.
 * Admin-only endpoint.
 *
 * Note: this route is under /api/auth/ which the middleware treats as public,
 * so x-user-role is not set. We read the role directly from the JWT cookie.
 */
export async function GET(request: NextRequest) {
  try {
    let role = request.headers.get('x-user-role') as Role | null

    if (!role) {
      const token = request.cookies.get(brand.cookies.access)?.value
      if (!token) {
        return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
      }
      try {
        const { payload } = await jwtVerify(token, ACCESS_SECRET)
        role = payload.role as Role
      } catch {
        return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
      }
    }

    requirePermission(role, 'admin', 'read')

    const status: {
      configured: boolean
      tokenPresent: boolean
      tokenValid: boolean
      driveAccessible: boolean
      scopes: string | null
      adminUserId: string | null
      error: string | null
    } = {
      configured: !!process.env.GOOGLE_CLIENT_ID,
      tokenPresent: false,
      tokenValid: false,
      driveAccessible: false,
      scopes: null,
      adminUserId: null,
      error: null,
    }

    if (!status.configured) {
      status.error = 'GOOGLE_CLIENT_ID non configurato. Google Drive disabilitato.'
      return NextResponse.json({ success: true, data: status })
    }

    // Find admin token
    const specificAdminId = process.env.GOOGLE_DRIVE_ADMIN_ID
    const adminToken = specificAdminId
      ? await prisma.googleToken.findUnique({
          where: { userId: specificAdminId },
          select: { userId: true, scope: true, expiresAt: true },
        })
      : await prisma.googleToken.findFirst({
          where: { user: { role: 'ADMIN' } },
          select: { userId: true, scope: true, expiresAt: true },
        })

    if (!adminToken) {
      status.error = 'Nessun admin con Google connesso.'
      return NextResponse.json({ success: true, data: status })
    }

    status.tokenPresent = true
    status.adminUserId = adminToken.userId
    status.scopes = adminToken.scope

    // Check if drive.file scope is present
    const hasDriveScope = adminToken.scope?.includes('drive.file') ?? false
    if (!hasDriveScope) {
      status.error = 'Scope drive.file mancante. Ricollegare Google.'
      return NextResponse.json({ success: true, data: status })
    }

    // Try to authenticate (this also handles refresh)
    const auth = await getAuthenticatedClient(adminToken.userId, false)
    if (!auth) {
      status.error = 'Token scaduto o revocato. Ricollegare Google.'
      return NextResponse.json({ success: true, data: status })
    }

    status.tokenValid = true

    // Try a simple Drive API call
    try {
      const drive = getDriveService(auth)
      await drive.about.get({ fields: 'user' })
      status.driveAccessible = true
    } catch (err) {
      status.error = `Drive API non raggiungibile: ${(err as Error).message}`
    }

    return NextResponse.json({ success: true, data: status })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[auth/google/health]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
