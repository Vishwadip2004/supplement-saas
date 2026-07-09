import { z } from 'zod'

// User validation schemas
export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']).optional(),
})

// Product validation schemas
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  brand: z.string().min(1, 'Brand is required'),
  purchasePrice: z.number().positive('Purchase price must be positive'),
  sellingPrice: z.number().positive('Selling price must be positive'),
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
  minStock: z.number().int().min(0, 'Minimum stock cannot be negative'),
  expiryDate: z.string().optional(),
  batchNumber: z.string().optional(),
  storageLocation: z.string().optional(),
})

// Sales validation schemas
export const saleSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
  discount: z.number().min(0, 'Discount cannot be negative').optional(),
  customerId: z.string().uuid('Invalid customer ID').optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER', 'OTHER']),
})

// Supplier validation schemas
export const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

// Customer validation schemas
export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
})

// Validation helper
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}
