import { describe, it, expect } from 'vitest'
import { generateOtp, hashOtp, verifyOtp } from '@/lib/otp'

describe('OTP Utils', () => {
  describe('generateOtp', () => {
    it('generates a 6-digit string', () => {
      const otp = generateOtp()
      expect(otp).toMatch(/^\d{6}$/)
    })

    it('generates different values on multiple calls', () => {
      const otps = new Set(Array.from({ length: 20 }, () => generateOtp()))
      // With 20 random 6-digit numbers, collisions are extremely unlikely
      expect(otps.size).toBeGreaterThan(15)
    })

    it('generates values in range 100000-999999', () => {
      for (let i = 0; i < 50; i++) {
        const otp = parseInt(generateOtp(), 10)
        expect(otp).toBeGreaterThanOrEqual(100000)
        expect(otp).toBeLessThan(1000000)
      }
    })
  })

  describe('hashOtp + verifyOtp', () => {
    it('correctly verifies a hashed OTP', async () => {
      const otp = '123456'
      const hash = await hashOtp(otp)
      const isValid = await verifyOtp(otp, hash)
      expect(isValid).toBe(true)
    })

    it('rejects wrong OTP', async () => {
      const hash = await hashOtp('123456')
      const isValid = await verifyOtp('654321', hash)
      expect(isValid).toBe(false)
    })

    it('produces different hashes for same input (bcrypt salt)', async () => {
      const hash1 = await hashOtp('123456')
      const hash2 = await hashOtp('123456')
      expect(hash1).not.toBe(hash2)
      // But both should verify correctly
      expect(await verifyOtp('123456', hash1)).toBe(true)
      expect(await verifyOtp('123456', hash2)).toBe(true)
    })
  })
})
