import { describe, it, expect } from 'vitest'
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  truncate,
  generateSKU,
  calculateProfit,
  calculateProfitMargin,
  isExpiringSoon,
  isLowStock,
} from '../index'

describe('cn', () => {
  it('should merge class names', () => {
    const result = cn('class1', 'class2')
    expect(result).toContain('class1')
    expect(result).toContain('class2')
  })

  it('should handle empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should merge tailwind classes', () => {
    const result = cn('px-4 py-2', 'px-8')
    expect(result).toContain('px-8')
    expect(result).toContain('py-2')
    expect(result).not.toContain('px-4')
  })
})

describe('formatCurrency', () => {
  it('should format currency in INR', () => {
    const result = formatCurrency(1000)
    expect(result).toContain('1')
    expect(result).toContain('000')
  })

  it('should handle zero', () => {
    const result = formatCurrency(0)
    expect(result).toBeDefined()
  })

  it('should handle decimal amounts', () => {
    const result = formatCurrency(1234.56)
    expect(result).toBeDefined()
  })
})

describe('formatDate', () => {
  it('should format date string', () => {
    const result = formatDate('2024-01-15')
    expect(result).toContain('Jan')
    expect(result).toContain('15')
    expect(result).toContain('2024')
  })

  it('should format Date object', () => {
    const result = formatDate(new Date('2024-06-20'))
    expect(result).toContain('Jun')
    expect(result).toContain('20')
  })
})

describe('formatDateTime', () => {
  it('should format date with time', () => {
    const result = formatDateTime('2024-01-15T14:30:00')
    expect(result).toContain('Jan')
    expect(result).toContain('15')
  })
})

describe('truncate', () => {
  it('should truncate long strings', () => {
    expect(truncate('hello world', 5)).toBe('hello...')
  })

  it('should not truncate short strings', () => {
    expect(truncate('hi', 5)).toBe('hi')
  })

  it('should handle exact length', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })
})

describe('generateSKU', () => {
  it('should generate SKU from category and id', () => {
    expect(generateSKU('Whey', 1)).toBe('WHE-00001')
  })

  it('should pad id with zeros', () => {
    expect(generateSKU('Protein', 42)).toBe('PRO-00042')
  })
})

describe('calculateProfit', () => {
  it('should calculate profit correctly', () => {
    expect(calculateProfit(100, 150)).toBe(50)
  })

  it('should handle negative profit', () => {
    expect(calculateProfit(150, 100)).toBe(-50)
  })

  it('should handle zero profit', () => {
    expect(calculateProfit(100, 100)).toBe(0)
  })
})

describe('calculateProfitMargin', () => {
  it('should calculate margin correctly', () => {
    expect(calculateProfitMargin(100, 150)).toBe(50)
  })

  it('should handle zero purchase price', () => {
    expect(calculateProfitMargin(0, 100)).toBe(Infinity)
  })

  it('should handle zero both prices', () => {
    expect(calculateProfitMargin(0, 0)).toBe(0)
  })
})

describe('isExpiringSoon', () => {
  it('should return true for dates expiring within threshold', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 15)
    expect(isExpiringSoon(futureDate, 30)).toBe(true)
  })

  it('should return false for dates not expiring soon', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 60)
    expect(isExpiringSoon(futureDate, 30)).toBe(false)
  })

  it('should return false for past dates', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 10)
    expect(isExpiringSoon(pastDate, 30)).toBe(false)
  })
})

describe('isLowStock', () => {
  it('should return true when quantity equals minStock', () => {
    expect(isLowStock(10, 10)).toBe(true)
  })

  it('should return true when quantity is less than minStock', () => {
    expect(isLowStock(5, 10)).toBe(true)
  })

  it('should return false when quantity is greater than minStock', () => {
    expect(isLowStock(15, 10)).toBe(false)
  })
})
