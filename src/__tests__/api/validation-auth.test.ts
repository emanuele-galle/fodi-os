import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  passwordSchema,
  forgotPasswordSchema,
  verifyIpOtpSchema,
} from '@/lib/validation/auth'

describe('Validation - loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ username: 'admin', password: 'secret123' })
    expect(result.success).toBe(true)
  })

  it('accepts email as username', () => {
    const result = loginSchema.safeParse({ username: 'admin@example.com', password: 'pass' })
    expect(result.success).toBe(true)
  })

  it('rejects empty username', () => {
    const result = loginSchema.safeParse({ username: '', password: 'secret123' })
    expect(result.success).toBe(false)
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ username: 'admin', password: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing fields', () => {
    expect(loginSchema.safeParse({}).success).toBe(false)
    expect(loginSchema.safeParse({ username: 'admin' }).success).toBe(false)
    expect(loginSchema.safeParse({ password: 'pass' }).success).toBe(false)
  })
})

describe('Validation - passwordSchema', () => {
  it('accepts valid password (8+ chars, uppercase, number)', () => {
    const result = passwordSchema.safeParse('Password1')
    expect(result.success).toBe(true)
  })

  it('rejects password shorter than 8 characters', () => {
    const result = passwordSchema.safeParse('Pass1')
    expect(result.success).toBe(false)
  })

  it('rejects password without uppercase letter', () => {
    const result = passwordSchema.safeParse('password1')
    expect(result.success).toBe(false)
  })

  it('rejects password without number', () => {
    const result = passwordSchema.safeParse('Password')
    expect(result.success).toBe(false)
  })

  it('accepts complex password', () => {
    const result = passwordSchema.safeParse('MyStr0ng!Pass#2026')
    expect(result.success).toBe(true)
  })
})

describe('Validation - forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects empty email', () => {
    const result = forgotPasswordSchema.safeParse({ email: '' })
    expect(result.success).toBe(false)
  })
})

describe('Validation - verifyIpOtpSchema', () => {
  it('accepts valid UUID and 6-digit OTP', () => {
    const result = verifyIpOtpSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      otp: '123456',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-UUID userId', () => {
    const result = verifyIpOtpSchema.safeParse({
      userId: 'not-a-uuid',
      otp: '123456',
    })
    expect(result.success).toBe(false)
  })

  it('rejects OTP with wrong length', () => {
    const result = verifyIpOtpSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      otp: '12345',
    })
    expect(result.success).toBe(false)
  })

  it('rejects OTP with non-numeric characters', () => {
    const result = verifyIpOtpSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      otp: 'abc123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects 7-digit OTP', () => {
    const result = verifyIpOtpSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      otp: '1234567',
    })
    expect(result.success).toBe(false)
  })
})
