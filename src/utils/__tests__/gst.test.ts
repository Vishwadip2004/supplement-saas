import { describe, it, expect } from 'vitest'
import { calculateGst, formatGstRate, formatGstin } from '../gst'

describe('calculateGst', () => {
  it('should calculate intra-state GST correctly (CGST + SGST)', () => {
    const result = calculateGst(1180, 18, false)
    expect(result.taxable).toBe(1000)
    expect(result.cgst).toBe(90)
    expect(result.sgst).toBe(90)
    expect(result.igst).toBe(0)
    expect(result.totalTax).toBe(180)
    expect(result.totalAmount).toBe(1180)
  })

  it('should calculate inter-state GST correctly (IGST)', () => {
    const result = calculateGst(1180, 18, true)
    expect(result.taxable).toBe(1000)
    expect(result.cgst).toBe(0)
    expect(result.sgst).toBe(0)
    expect(result.igst).toBe(180)
    expect(result.totalTax).toBe(180)
    expect(result.totalAmount).toBe(1180)
  })

  it('should handle 0% GST rate', () => {
    const result = calculateGst(1000, 0, false)
    expect(result.taxable).toBe(1000)
    expect(result.cgst).toBe(0)
    expect(result.sgst).toBe(0)
    expect(result.igst).toBe(0)
    expect(result.totalTax).toBe(0)
    expect(result.totalAmount).toBe(1000)
  })

  it('should handle 12% GST rate', () => {
    const result = calculateGst(1120, 12, false)
    expect(result.taxable).toBe(1000)
    expect(result.cgst).toBe(60)
    expect(result.sgst).toBe(60)
    expect(result.totalTax).toBe(120)
  })

  it('should handle 5% GST rate', () => {
    const result = calculateGst(1050, 5, false)
    expect(result.taxable).toBe(1000)
    expect(result.cgst).toBe(25)
    expect(result.sgst).toBe(25)
    expect(result.totalTax).toBe(50)
  })

  it('should handle small amounts correctly', () => {
    const result = calculateGst(11.80, 18, false)
    expect(result.taxable).toBe(10)
    expect(result.totalTax).toBe(1.80)
  })

  it('should handle zero amount', () => {
    const result = calculateGst(0, 18, false)
    expect(result.taxable).toBe(0)
    expect(result.totalTax).toBe(0)
  })

  it('should round tax correctly to avoid floating point issues', () => {
    const result = calculateGst(100, 18, false)
    expect(result.taxable).toBeCloseTo(84.75, 2)
    expect(result.totalTax).toBeCloseTo(15.25, 2)
  })
})

describe('formatGstRate', () => {
  it('should format rate with percentage', () => {
    expect(formatGstRate(18)).toBe('18%')
    expect(formatGstRate(0)).toBe('0%')
    expect(formatGstRate(12)).toBe('12%')
    expect(formatGstRate(5)).toBe('5%')
  })
})

describe('formatGstin', () => {
  it('should format GSTIN correctly', () => {
    expect(formatGstin('22AAAAA0000A1Z5')).toBe('22 AAAAA 0000 A 1 Z 5')
  })

  it('should return empty string for empty input', () => {
    expect(formatGstin('')).toBe('')
  })
})
