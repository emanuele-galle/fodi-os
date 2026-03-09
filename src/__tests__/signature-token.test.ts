import { describe, it, expect, vi } from 'vitest'

vi.stubEnv('SIGNATURE_SECRET', 'test-secret-key-for-testing-purposes-1234')

import { createSignatureToken, verifySignatureToken } from '@/lib/signature-token'

describe('Signature Token', () => {
  it('creates and verifies a token', async () => {
    const requestId = 'req-abc-123'
    const token = await createSignatureToken(requestId)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)

    const payload = await verifySignatureToken(token)
    expect(payload.requestId).toBe(requestId)
  })

  it('rejects tampered token', async () => {
    const token = await createSignatureToken('req-123')
    const tampered = token.slice(0, -5) + 'XXXXX'
    await expect(verifySignatureToken(tampered)).rejects.toThrow()
  })

  it('rejects completely invalid token', async () => {
    await expect(verifySignatureToken('not-a-jwt')).rejects.toThrow()
  })

  it('produces different tokens for different requestIds', async () => {
    const token1 = await createSignatureToken('req-1')
    const token2 = await createSignatureToken('req-2')
    expect(token1).not.toBe(token2)
  })
})
