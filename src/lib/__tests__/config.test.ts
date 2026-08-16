import { describe, it, expect } from 'vitest'
import { securityConfig } from '../security/config'

describe('securityConfig', () => {
  it('should have JWT configuration', () => {
    expect(securityConfig.jwt).toBeDefined()
    expect(securityConfig.jwt.expiresIn).toBe('15m')
    expect(securityConfig.jwt.refreshExpiresIn).toBe('7d')
  })

  it('should have session configuration', () => {
    expect(securityConfig.session).toBeDefined()
    expect(securityConfig.session.maxAge).toBe(24 * 60 * 60)
  })

  it('should have password configuration', () => {
    expect(securityConfig.password).toBeDefined()
    expect(securityConfig.password.minLength).toBe(12)
    expect(securityConfig.password.requireUppercase).toBe(true)
    expect(securityConfig.password.requireLowercase).toBe(true)
    expect(securityConfig.password.requireNumbers).toBe(true)
    expect(securityConfig.password.requireSpecialChars).toBe(true)
    expect(securityConfig.password.historyCount).toBe(12)
  })

  it('should have rate limit configuration', () => {
    expect(securityConfig.rateLimit).toBeDefined()
    expect(securityConfig.rateLimit.windowMs).toBe(15 * 60 * 1000)
  })

  it('should have encryption configuration', () => {
    expect(securityConfig.encryption).toBeDefined()
    expect(securityConfig.encryption.algorithm).toBe('aes-256-gcm')
    expect(securityConfig.encryption.keyLength).toBe(32)
    expect(securityConfig.encryption.ivLength).toBe(16)
  })

  it('should have CORS configuration', () => {
    expect(securityConfig.cors).toBeDefined()
    expect(securityConfig.cors.credentials).toBe(true)
  })
})
