import { z } from 'zod'

export const userSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z.string().min(12, 'Password must be at least 12 characters').max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
})

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  sku: z.string().min(1, 'SKU is required').max(50),
  barcode: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().min(1, 'Category is required').max(100),
  brand: z.string().min(1, 'Brand is required').max(100),
  purchasePrice: z.number().positive('Purchase price must be positive'),
  sellingPrice: z.number().positive('Selling price must be positive'),
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
  minStock: z.number().int().min(0, 'Minimum stock cannot be negative'),
  expiryDate: z.string().datetime({ message: 'Invalid date format' }).optional().or(z.literal('')),
  batchNumber: z.string().max(50).optional(),
  storageLocation: z.string().max(100).optional(),
})

export const saleSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  discount: z.number().min(0, 'Discount cannot be negative').max(100000, 'Discount too large').optional(),
  customerId: z.string().uuid('Invalid customer ID').optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER', 'OTHER']),
})

export const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(255),
  contactPerson: z.string().max(100).optional(),
  email: z.string().email('Invalid email address').max(255).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
})

export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(255),
  email: z.string().email('Invalid email address').max(255).optional().or(z.literal('')).transform(v => v || undefined),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
})

export const purchaseOrderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
})

export const purchaseOrderSchema = z.object({
  supplierId: z.string().uuid('Invalid supplier ID'),
  notes: z.string().max(1000).optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
})

export const stockMovementSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  type: z.enum(['IN', 'ADJUSTMENT']),
  reference: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
})

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}
