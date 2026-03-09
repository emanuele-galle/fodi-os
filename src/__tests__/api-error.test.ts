import { describe, it, expect, vi } from 'vitest'

// Mock logger before importing
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { ApiError, handleApiError } from '@/lib/api-error'

describe('ApiError class', () => {
  it('creates error with statusCode and message', () => {
    const err = new ApiError(400, 'Bad Request')
    expect(err.statusCode).toBe(400)
    expect(err.message).toBe('Bad Request')
    expect(err.name).toBe('ApiError')
    expect(err.details).toBeUndefined()
  })

  it('creates error with details', () => {
    const err = new ApiError(422, 'Validation failed', { fields: ['email'] })
    expect(err.details).toEqual({ fields: ['email'] })
  })

  it('is an instance of Error', () => {
    const err = new ApiError(500, 'Server error')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('handleApiError', () => {
  it('returns 403 for permission denied errors', async () => {
    const error = new Error('Permission denied: DEVELOPER cannot write on erp')
    const response = handleApiError(error)
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('Permission denied')
  })

  it('returns correct status for ApiError', async () => {
    const error = new ApiError(422, 'Dati non validi', { field: 'email' })
    const response = handleApiError(error)
    expect(response.status).toBe(422)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Dati non validi')
    expect(body.details).toEqual({ field: 'email' })
  })

  it('returns ApiError without details when none provided', async () => {
    const error = new ApiError(404, 'Non trovato')
    const response = handleApiError(error)
    const body = await response.json()
    expect(body.details).toBeUndefined()
  })

  it('returns 500 for unknown errors', async () => {
    const response = handleApiError(new Error('Something unexpected'))
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Errore interno del server')
  })

  it('returns 500 for non-Error thrown values', async () => {
    const response = handleApiError('string error')
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Errore interno del server')
  })

  it('logs unexpected errors', async () => {
    const { logger } = await import('@/lib/logger')
    handleApiError(new Error('Unexpected crash'))
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith('Unexpected API error', { error: 'Unexpected crash' })
  })
})
