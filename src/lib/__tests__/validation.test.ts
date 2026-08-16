import { describe, it, expect } from 'vitest'
import { customerSchema, supplierSchema, productSchema, validateInput } from '../security/validation'

describe('customerSchema', () => {
  it('should accept valid customer with only name', () => {
    const result = customerSchema.safeParse({ name: 'John Doe' })
    expect(result.success).toBe(true)
  })

  it('should accept valid customer with all fields', () => {
    const result = customerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      address: '123 Main St',
      gstin: '22AAAAA0000A1Z5',
      state: 'Maharashtra',
    })
    expect(result.success).toBe(true)
  })

  it('should reject customer without name', () => {
    const result = customerSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('should reject customer with empty name', () => {
    const result = customerSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('should reject customer with invalid email', () => {
    const result = customerSchema.safeParse({ name: 'John', email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('should accept customer with optional fields as undefined', () => {
    const result = customerSchema.safeParse({ name: 'John', email: undefined, phone: undefined })
    expect(result.success).toBe(true)
  })
})

describe('supplierSchema', () => {
  it('should accept valid supplier with only name', () => {
    const result = supplierSchema.safeParse({ name: 'Acme Corp' })
    expect(result.success).toBe(true)
  })

  it('should reject supplier without name', () => {
    const result = supplierSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('should accept supplier with all optional fields', () => {
    const result = supplierSchema.safeParse({
      name: 'Acme Corp',
      contactPerson: 'Jane',
      email: 'jane@acme.com',
      phone: '9876543210',
      address: '456 Oak Ave',
      notes: 'Reliable supplier',
      leadTimeDays: 7,
    })
    expect(result.success).toBe(true)
  })
})

describe('productSchema', () => {
  const validProduct = {
    name: 'Whey Protein',
    sku: 'WP-001',
    category: 'Protein',
    brand: 'Optimum',
    purchasePrice: 1000,
    sellingPrice: 1500,
    quantity: 50,
    minStock: 10,
  }

  it('should accept valid product', () => {
    const result = productSchema.safeParse(validProduct)
    expect(result.success).toBe(true)
  })

  it('should reject product without name', () => {
    const result = productSchema.safeParse({ ...validProduct, name: '' })
    expect(result.success).toBe(false)
  })

  it('should reject product without sku', () => {
    const result = productSchema.safeParse({ ...validProduct, sku: '' })
    expect(result.success).toBe(false)
  })

  it('should reject product with negative price', () => {
    const result = productSchema.safeParse({ ...validProduct, purchasePrice: -1 })
    expect(result.success).toBe(false)
  })

  it('should reject product with negative quantity', () => {
    const result = productSchema.safeParse({ ...validProduct, quantity: -5 })
    expect(result.success).toBe(false)
  })
})

describe('validateInput', () => {
  it('should return success with data on valid input', () => {
    const result = validateInput(customerSchema, { name: 'Test' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Test')
    }
  })

  it('should return errors on invalid input', () => {
    const result = validateInput(customerSchema, {})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.issues.length).toBeGreaterThan(0)
    }
  })
})
