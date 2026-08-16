import { describe, it, expect } from 'vitest'
import { generateInvoiceNumber, incrementInvoiceNumber, parseInvoiceNumber } from '../invoice'

describe('generateInvoiceNumber', () => {
  it('should generate invoice number with prefix and padded number', () => {
    expect(generateInvoiceNumber('INV', 1)).toBe('INV-000001')
    expect(generateInvoiceNumber('INV', 100)).toBe('INV-000100')
    expect(generateInvoiceNumber('INV', 999999)).toBe('INV-999999')
  })

  it('should handle different prefixes', () => {
    expect(generateInvoiceNumber('SALE', 1)).toBe('SALE-000001')
    expect(generateInvoiceNumber('BILL', 42)).toBe('BILL-000042')
  })

  it('should handle zero', () => {
    expect(generateInvoiceNumber('INV', 0)).toBe('INV-000000')
  })
})

describe('incrementInvoiceNumber', () => {
  it('should increment invoice number correctly', () => {
    expect(incrementInvoiceNumber('INV-000001')).toBe('INV-000002')
    expect(incrementInvoiceNumber('INV-000099')).toBe('INV-000100')
    expect(incrementInvoiceNumber('INV-000999')).toBe('INV-001000')
  })

  it('should handle large numbers', () => {
    expect(incrementInvoiceNumber('INV-999999')).toBe('INV-1000000')
  })

  it('should return original if format is invalid', () => {
    expect(incrementInvoiceNumber('INVALID')).toBe('INVALID')
    expect(incrementInvoiceNumber('INV-ABC')).toBe('INV-ABC')
    expect(incrementInvoiceNumber('')).toBe('')
  })
})

describe('parseInvoiceNumber', () => {
  it('should parse valid invoice number', () => {
    const result = parseInvoiceNumber('INV-000001')
    expect(result).toEqual({ prefix: 'INV', number: 1 })
  })

  it('should parse invoice number with larger number', () => {
    const result = parseInvoiceNumber('SALE-12345')
    expect(result).toEqual({ prefix: 'SALE', number: 12345 })
  })

  it('should return null for invalid format', () => {
    expect(parseInvoiceNumber('INVALID')).toBeNull()
    expect(parseInvoiceNumber('')).toBeNull()
    expect(parseInvoiceNumber('INV-ABC')).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(parseInvoiceNumber('')).toBeNull()
  })
})
