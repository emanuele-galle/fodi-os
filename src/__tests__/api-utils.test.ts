import { describe, it, expect } from 'vitest'
import { getAuthHeaders } from '@/lib/api-utils'

// Minimal mock for NextRequest headers
function createMockRequest(headers: Record<string, string> = {}) {
  return {
    headers: {
      get: (key: string) => headers[key] || null,
    },
  } as Parameters<typeof getAuthHeaders>[0]
}

describe('API Utils - getAuthHeaders', () => {
  it('returns ok:true with userId and role when headers present', () => {
    const request = createMockRequest({
      'x-user-id': 'user-123',
      'x-user-role': 'ADMIN',
    })
    const result = getAuthHeaders(request)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.userId).toBe('user-123')
      expect(result.role).toBe('ADMIN')
      expect(result.customRoleId).toBeNull()
    }
  })

  it('returns customRoleId when header is present', () => {
    const request = createMockRequest({
      'x-user-id': 'user-123',
      'x-user-role': 'COMMERCIALE',
      'x-custom-role-id': 'custom-role-456',
    })
    const result = getAuthHeaders(request)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.customRoleId).toBe('custom-role-456')
    }
  })

  it('returns ok:false when x-user-id is missing', () => {
    const request = createMockRequest({
      'x-user-role': 'ADMIN',
    })
    const result = getAuthHeaders(request)
    expect(result.ok).toBe(false)
  })

  it('returns ok:false when x-user-role is missing', () => {
    const request = createMockRequest({
      'x-user-id': 'user-123',
    })
    const result = getAuthHeaders(request)
    expect(result.ok).toBe(false)
  })

  it('returns ok:false when both headers are missing', () => {
    const request = createMockRequest({})
    const result = getAuthHeaders(request)
    expect(result.ok).toBe(false)
  })

  it('returns 401 response when authentication fails', async () => {
    const request = createMockRequest({})
    const result = getAuthHeaders(request)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(401)
      const body = await result.response.json()
      expect(body.error).toBe('Non autenticato')
    }
  })
})
