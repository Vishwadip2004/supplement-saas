import { describe, it, expect } from 'vitest'
import { validateCsrfRequest, getCsrfCookieName, getCsrfHeaderName } from '../csrf'

describe('CSRF helpers', () => {
  it('should return correct cookie name', () => {
    expect(getCsrfCookieName()).toBe('csrf-token')
  })

  it('should return correct header name', () => {
    expect(getCsrfHeaderName()).toBe('x-csrf-token')
  })
})

describe('validateCsrfRequest', () => {
  it('should return true when header matches cookie token', () => {
    const token = 'a'.repeat(32)
    const request = new Request('http://localhost', {
      headers: {
        'x-csrf-token': token,
        'cookie': `csrf-token=${token}`,
      },
    })
    expect(validateCsrfRequest(request)).toBe(true)
  })

  it('should return false when no CSRF header', () => {
    const request = new Request('http://localhost', {
      headers: { 'cookie': 'csrf-token=abc' },
    })
    expect(validateCsrfRequest(request)).toBe(false)
  })

  it('should return false for short CSRF token (< 16 chars)', () => {
    const token = 'short'
    const request = new Request('http://localhost', {
      headers: {
        'x-csrf-token': token,
        'cookie': `csrf-token=${token}`,
      },
    })
    expect(validateCsrfRequest(request)).toBe(false)
  })

  it('should return false when header and cookie do not match', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-csrf-token': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'cookie': 'csrf-token=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      },
    })
    expect(validateCsrfRequest(request)).toBe(false)
  })

  it('should return false when cookie is missing', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-csrf-token': 'a'.repeat(32),
      },
    })
    expect(validateCsrfRequest(request)).toBe(false)
  })

  it('should return true for exactly 16 chars matching', () => {
    const token = 'a'.repeat(16)
    const request = new Request('http://localhost', {
      headers: {
        'x-csrf-token': token,
        'cookie': `csrf-token=${token}`,
      },
    })
    expect(validateCsrfRequest(request)).toBe(true)
  })
})
