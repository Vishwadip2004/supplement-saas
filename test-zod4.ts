import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  sku: z.string().min(1, 'SKU is required').max(50),
  barcode: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().min(1, 'Category is required').max(100),
  brand: z.string().min(1, 'Brand is required').max(100),
  flavor: z.string().max(100).optional(),
  purchasePrice: z.number().positive('Purchase price must be positive'),
  sellingPrice: z.number().positive('Selling price must be positive'),
  gstRate: z.number().min(0).max(100).optional().default(18),
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
  minStock: z.number().int().min(0, 'Minimum stock cannot be negative'),
  reorderLevel: z.number().int().min(0).optional(),
  expiryDate: z.string().optional().or(z.literal('')).refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: 'Invalid date format' }
  ),
  batchNumber: z.string().max(50).optional(),
  storageLocation: z.string().max(100).optional(),
})

const productUpdateSchema = productSchema.partial()

const updatePayload = {
  name: "Test Product",
  sku: "SKU-001",
  category: "Whey Protein",
  brand: "Brand",
  purchasePrice: 100,
  sellingPrice: 150,
  gstRate: 18,
  quantity: 50,
  minStock: 10,
  reorderLevel: 5,
  flavor: "Chocolate",
  barcode: "123456789",
  description: "A product",
  expiryDate: "",
  batchNumber: "B001",
  storageLocation: "Shelf A"
}

console.log("=== Testing productUpdateSchema.safeParse ===")
const result = productUpdateSchema.safeParse(updatePayload)
console.log("Success:", result.success)
if (!result.success) {
  console.log("Error:", JSON.stringify(result.error.issues, null, 2))
}

// Also test with undefined expiryDate
console.log("\n=== Testing with expiryDate: undefined ===")
const payload2 = { ...updatePayload, expiryDate: undefined }
const result2 = productUpdateSchema.safeParse(payload2)
console.log("Success:", result2.success)
if (!result2.success) {
  console.log("Error:", JSON.stringify(result2.error.issues, null, 2))
}

// Test with no expiryDate at all
console.log("\n=== Testing without expiryDate field ===")
const { expiryDate: _, ...payload3 } = updatePayload
const result3 = productUpdateSchema.safeParse(payload3)
console.log("Success:", result3.success)
if (!result3.success) {
  console.log("Error:", JSON.stringify(result3.error.issues, null, 2))
}
