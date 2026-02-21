import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { Role } from '@/generated/prisma/client'

type AuthResult =
  | { ok: true; userId: string; role: Role; customRoleId: string | null }
  | { ok: false; response: NextResponse }

/**
 * Safely extract auth headers set by middleware.
 * Returns a discriminated union: callers must check `ok` before accessing userId/role.
 */
export function getAuthHeaders(request: NextRequest): AuthResult {
  const userId = request.headers.get('x-user-id')
  const role = request.headers.get('x-user-role') as Role | null
  const customRoleId = request.headers.get('x-custom-role-id') || null

  if (!userId || !role) {
    return { ok: false, response: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }
  }

  return { ok: true, userId, role, customRoleId }
}
