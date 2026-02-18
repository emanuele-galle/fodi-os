import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Role } from '@/generated/prisma/client'

/**
 * Safely extract auth headers set by middleware.
 * Returns userId and role with proper null-check (no more `as Role` without validation).
 */
export function getAuthHeaders(request: NextRequest): { userId: string; role: Role } {
  const userId = request.headers.get('x-user-id')
  const role = request.headers.get('x-user-role') as Role | null

  if (!userId || !role) {
    throw NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

  return { userId, role }
}
