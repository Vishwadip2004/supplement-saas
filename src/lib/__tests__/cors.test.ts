import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setCorsHeaders, handleCorsPreflight } from '../cors'

describe('setCorsHeaders', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should set CORS headers for allowed origin', () => {
    const nextResponse = new Response(null, { status: 200 })
    const result = setCorsHeaders(nextResponse as never, 'http://localhost:3000')
    expect(result.headers.get('Access-Control-Allow-Methods')).toContain('GET')
    expect(result.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })

  it('should set CORS headers without origin', () => {
    const nextResponse = new Response(null, { status: 200 })
    const result = setCorsHeaders(nextResponse as never)
    expect(result.headers.get('Access-Control-Allow-Methods')).toContain('GET')
  })
})

describe('handleCorsPreflight', () => {
  it('should return 204 with CORS headers', () => {
    const response = handleCorsPreflight()
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('OPTIONS')
  })
})
