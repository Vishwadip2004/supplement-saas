import { describe, it, expect } from 'vitest'
import { createTOTPSecret, verifyTOTP, getTOTPUri } from '../mfa'

describe('MFA', () => {
  describe('createTOTPSecret', () => {
    it('should create TOTP secret for email', () => {
      const totp = createTOTPSecret('test@example.com')
      expect(totp).toBeDefined()
      expect(totp.secret).toBeDefined()
      expect(totp.secret.base32).toBeDefined()
      expect(totp.secret.base32.length).toBeGreaterThan(0)
    })

    it('should create unique secrets for different calls', () => {
      const totp1 = createTOTPSecret('test@example.com')
      const totp2 = createTOTPSecret('test@example.com')
      expect(totp1.secret.base32).not.toBe(totp2.secret.base32)
    })
  })

  describe('getTOTPUri', () => {
    it('should generate valid TOTP URI', () => {
      const totp = createTOTPSecret('test@example.com')
      const uri = getTOTPUri(totp.secret.base32, 'test@example.com')
      expect(uri).toContain('otpauth://totp/')
      expect(uri).toContain('test%40example.com')
      expect(uri).toContain('SHA256')
    })
  })

  describe('verifyTOTP', () => {
    it('should verify valid TOTP code', () => {
      const totp = createTOTPSecret('test@example.com')
      const code = totp.generate()
      const result = verifyTOTP(totp.secret.base32, code)
      expect(result).toBe(true)
    })

    it('should reject invalid TOTP code', () => {
      const totp = createTOTPSecret('test@example.com')
      const result = verifyTOTP(totp.secret.base32, '000000')
      expect(result).toBe(false)
    })

    it('should reject empty code', () => {
      const totp = createTOTPSecret('test@example.com')
      const result = verifyTOTP(totp.secret.base32, '')
      expect(result).toBe(false)
    })
  })
})
