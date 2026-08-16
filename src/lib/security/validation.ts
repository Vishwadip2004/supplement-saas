import { z } from 'zod'

export const userSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z.string().min(12, 'Password must be at least 12 characters').max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']).optional(),
})

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  sku: z.string().min(1, 'SKU is required').max(50),
  barcode: z.string().max(100).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  description: z.string().max(2000).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  category: z.string().min(1, 'Category is required').max(100),
  brand: z.string().max(100).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  flavor: z.string().max(100).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  size: z.string().max(50).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  purchasePrice: z.number().positive('Purchase price must be positive'),
  sellingPrice: z.number().positive('Selling price must be positive'),
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
  minStock: z.number().int().min(0, 'Minimum stock cannot be negative'),
  gstRate: z.number().min(0).max(100).optional(),
  reorderLevel: z.number().int().min(0).optional(),
  expiryDate: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  batchNumber: z.string().max(50).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  storageLocation: z.string().max(100).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
})

export const productUpdateSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255).optional(),
  sku: z.string().min(1, 'SKU is required').max(50).optional(),
  barcode: z.string().max(100).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  description: z.string().max(2000).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  category: z.string().min(1, 'Category is required').max(100).optional(),
  brand: z.string().max(100).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  flavor: z.string().max(100).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  size: z.string().max(50).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  purchasePrice: z.coerce.number().positive('Purchase price must be positive').optional(),
  sellingPrice: z.coerce.number().positive('Selling price must be positive').optional(),
  quantity: z.coerce.number().int().min(0, 'Quantity cannot be negative').optional(),
  minStock: z.coerce.number().int().min(0, 'Minimum stock cannot be negative').optional(),
  gstRate: z.coerce.number().min(0).max(100).optional(),
  reorderLevel: z.coerce.number().int().min(0).optional(),
  expiryDate: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  batchNumber: z.string().max(50).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  storageLocation: z.string().max(100).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
})

export const saleItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive').optional(),
  discount: z.number().min(0).max(100000).optional(),
  lotNumber: z.string().max(50).optional(),
})

export const saleSchema = z.union([
  z.object({
    productId: z.string().uuid('Invalid product ID'),
    quantity: z.number().int().positive('Quantity must be positive'),
    discount: z.number().min(0, 'Discount cannot be negative').max(100000, 'Discount too large').optional(),
    paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER', 'UPI', 'OTHER']),
    customerName: z.string().max(255).optional(),
    notes: z.string().max(1000).optional(),
    lotNumber: z.string().max(50).optional(),
  }),
  z.object({
    items: z.array(saleItemSchema).min(1, 'At least one item is required'),
    paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER', 'UPI', 'OTHER']),
    customerName: z.string().max(255).optional(),
    notes: z.string().max(1000).optional(),
  }),
])

export const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(255),
  contactPerson: z.string().max(100).optional(),
  email: z.string().email('Invalid email address').max(255).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  leadTimeDays: z.number().int().min(0).optional(),
})

export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(255),
  email: z.string().email('Invalid email address').max(255).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  gstin: z.string().max(20).optional(),
  state: z.string().max(100).optional(),
})

export const purchaseOrderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
  landedCost: z.number().min(0).optional(),
  lotNumber: z.string().max(50).optional(),
  expiryDate: z.string().optional(),
})

export const purchaseOrderSchema = z.object({
  supplierId: z.string().uuid('Invalid supplier ID'),
  notes: z.string().max(1000).optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
})

export const recallSchema = z.object({
  batchNumber: z.string().min(1, 'Batch number is required').max(50),
  reason: z.string().min(1, 'Reason is required').max(500),
  notes: z.string().max(1000).optional(),
})

export const bundleItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
})

export const bundleSchema = z.object({
  name: z.string().min(1, 'Bundle name is required').max(255),
  description: z.string().max(1000).optional(),
  bundlePrice: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  items: z.array(bundleItemSchema).min(1, 'At least one item is required'),
})

export const bundleUpdateSchema = z.object({
  id: z.string().uuid('Invalid bundle ID'),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  bundlePrice: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  items: z.array(bundleItemSchema).min(1).optional(),
})

export const lotSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  batchNumber: z.string().min(1, 'Batch number is required').max(50),
  expiryDate: z.string().optional().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: 'Invalid date format' }
  ),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  purchasePrice: z.number().min(0).optional(),
  landedCost: z.number().min(0).optional(),
  coaUrl: z.string().url().max(500).optional().or(z.literal('')),
  coaNotes: z.string().max(1000).optional(),
})

export const staffCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').max(255),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']),
})

export const staffUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']).optional(),
  isActive: z.boolean().optional(),
  newPassword: z.string().min(12).max(128)
    .regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/)
    .optional(),
})

export const shopSettingsSchema = z.object({
  shopName: z.string().min(1, 'Shop name is required').max(50),
})

export const purchaseOrderStatusSchema = z.object({
  status: z.enum(['APPROVED', 'RECEIVED', 'CANCELLED']),
})

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}
