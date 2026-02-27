import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: unknown): NextResponse {
  // Permission errors from requirePermission()
  if (error instanceof Error && error.message.startsWith('Permission denied')) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 403 }
    )
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      { success: false, error: error.message, ...(error.details ? { details: error.details } : {}) },
      { status: error.statusCode }
    )
  }

  logger.error('Unexpected API error', { error: error instanceof Error ? error.message : String(error) })
  return NextResponse.json(
    { success: false, error: 'Errore interno del server' },
    { status: 500 }
  )
}
