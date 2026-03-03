import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

/**
 * Extract and validate portal client from request headers.
 * All portal API routes should use this helper.
 */
async function getPortalClient(request: NextRequest) {
  const role = request.headers.get('x-user-role') as Role
  const userId = request.headers.get('x-user-id')!
  requirePermission(role, 'portal', 'read')

  const client = await prisma.client.findUnique({
    where: { portalUserId: userId },
  })

  if (!client) {
    return null
  }

  return { ...client, userId }
}

/**
 * Shorthand that returns a 404 response if client is not found.
 */
export async function requirePortalClient(request: NextRequest) {
  const client = await getPortalClient(request)
  if (!client) {
    throw new PortalClientNotFoundError()
  }
  return client
}

class PortalClientNotFoundError extends Error {
  constructor() {
    super('Client non trovato')
  }
}

/**
 * Standard error handler for portal API routes.
 */
export function handlePortalError(e: unknown, context: string) {
  if (e instanceof PortalClientNotFoundError) {
    return NextResponse.json({ error: 'Client non trovato' }, { status: 404 })
  }
  if (e instanceof Error && e.message.startsWith('Permission denied')) {
    return NextResponse.json({ error: e.message }, { status: 403 })
  }
  console.error(`[${context}]`, e)
  return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
}
