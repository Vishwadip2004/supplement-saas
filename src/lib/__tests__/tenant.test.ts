import { describe, it, expect } from 'vitest'
import { extractTenantId } from '../tenant'

describe('extractTenantId', () => {
  it('should extract tenant ID from valid session', () => {
    const session = { user: { tenantId: 'tenant-123' } }
    expect(extractTenantId(session)).toBe('tenant-123')
  })

  it('should throw for session without user', () => {
    expect(() => extractTenantId({})).toThrow('Unauthorized: No tenant context')
  })

  it('should throw for session without tenantId', () => {
    expect(() => extractTenantId({ user: {} })).toThrow('Unauthorized: No tenant context')
  })

  it('should throw for null user in session', () => {
    expect(() => extractTenantId({ user: undefined })).toThrow('Unauthorized: No tenant context')
  })
})
