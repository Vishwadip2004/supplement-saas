import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkRateLimit, getClientIp } from '../security/rateLimit'

describe('getClientIp', () => {
  it('should return x-real-ip header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-real-ip': '192.168.1.1' },
    })
    expect(getClientIp(request)).toBe('192.168.1.1')
  })

  it('should ignore x-forwarded-for in production (anti-spoofing)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' },
    })
    expect(getClientIp(request)).toBe('unknown')
    vi.unstubAllEnvs()
  })

  it('should return x-forwarded-for in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' },
    })
    expect(getClientIp(request)).toBe('10.0.0.1')
    vi.unstubAllEnvs()
  })

  it('should return "unknown" if no IP headers', () => {
    const request = new Request('http://localhost')
    expect(getClientIp(request)).toBe('unknown')
  })
})

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should allow request within rate limit', async () => {
    const result = await checkRateLimit('1.2.3.4', 5, 60000)
    expect(result).toBe(true)
  })

  it('should block request exceeding rate limit', async () => {
    const ip = 'test-block-ip-' + Date.now()
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(ip, 5, 60000)
    }
    const result = await checkRateLimit(ip, 5, 60000)
    expect(result).toBe(false)
  })

  it('should allow requests after window resets', async () => {
    const ip = 'test-reset-ip-' + Date.now()
    await checkRateLimit(ip, 1, 1)
    await new Promise(resolve => setTimeout(resolve, 10))
    const result = await checkRateLimit(ip, 1, 1)
    expect(result).toBe(true)
  })
})
