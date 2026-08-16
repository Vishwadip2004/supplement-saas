// User types
export interface User {
  id: string
  tenantId: string
  email: string
  name: string
  role: 'ADMIN' | 'MANAGER' | 'STAFF'
  isActive: boolean
  mfaEnabled: boolean
  lastLogin?: Date
  tokenVersion: number
  createdAt: Date
  updatedAt: Date
}

// Product types
export interface Product {
  id: string
  tenantId: string
  name: string
  sku: string
  barcode?: string
  description?: string
  category: string
  brand: string
  flavor?: string
  size?: string
  purchasePrice: number
  sellingPrice: number
  hsnCode?: string
  gstRate: number
  quantity: number
  minStock: number
  reorderLevel?: number
  expiryDate?: Date
  batchNumber?: string
  storageLocation?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Supplier types
export interface Supplier {
  id: string
  tenantId: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  leadTimeDays?: number
  qualityRating?: number
  onTimeRate?: number
  totalOrders: number
  onTimeOrders: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Sale types
export interface Sale {
  id: string
  tenantId: string
  productId: string
  customerId?: string
  invoiceNumber?: string
  quantity: number
  unitPrice: number
  discount: number
  totalAmount: number
  cgst: number
  sgst: number
  igst: number
  totalTax: number
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'UPI' | 'OTHER'
  customerName?: string
  notes?: string
  lotNumber?: string
  expiryDate?: Date
  createdAt: Date
}

// Purchase Order types
export interface PurchaseOrder {
  id: string
  tenantId: string
  supplierId: string
  status: 'PENDING' | 'APPROVED' | 'RECEIVED' | 'CANCELLED'
  totalAmount: number
  expectedDeliveryDate?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface PurchaseOrderItem {
  id: string
  purchaseOrderId: string
  productId: string
  quantity: number
  unitPrice: number
  landedCost?: number
  lotNumber?: string
  expiryDate?: Date
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Dashboard Stats (from /api/reports)
export interface DashboardData {
  totalProducts: number
  lowStock: number
  expiringSoon: number
  totalSales: number
  todaySales: number
  recentSales: DashboardSale[]
}

// Sale item in dashboard/reports (with product included, serialized as strings)
export interface DashboardSale {
  id: string
  quantity: number
  totalAmount: number
  paymentMethod: string
  createdAt: string
  product: { name: string }
}

// Sale with relations (from /api/sales with include)
export interface SaleWithRelations {
  id: string
  tenantId: string
  productId: string
  customerId?: string | null
  invoiceNumber?: string | null
  quantity: number
  unitPrice: number
  discount: number
  totalAmount: number
  cgst: number
  sgst: number
  igst: number
  totalTax: number
  paymentMethod: string
  customerName?: string | null
  notes?: string | null
  lotNumber?: string | null
  expiryDate?: string | null
  createdAt: string
  product: { name: string; sellingPrice: number; sku: string; hsnCode?: string; gstRate: number }
  customer?: { id: string; name: string; phone?: string | null } | null
}

// Lot types
export interface Lot {
  id: string
  tenantId: string
  productId: string
  batchNumber: string
  expiryDate?: Date
  quantity: number
  purchasePrice?: number
  landedCost?: number
  coaUrl?: string
  coaNotes?: string
  receivedAt: Date
  createdAt: Date
  updatedAt: Date
}

// Category types
export interface Category {
  id: string
  tenantId: string
  name: string
  emoji: string
  color: string
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Audit Log types
export interface AuditLog {
  id: string
  tenantId: string
  userId?: string
  action: string
  resource: string
  resourceId?: string
  details?: string
  ipAddress?: string
  userAgent?: string
  status: 'SUCCESS' | 'FAILURE' | 'WARNING'
  timestamp: Date
}

// GST Settings type
export interface GstSettings {
  gstin: string
  businessName: string
  businessAddress: string
  businessState: string
  stateCode: string
  defaultGstRate: string
  invoicePrefix: string
  invoiceNextNumber: string
}

// Report types
export interface SalesReport {
  totalSales: number
  totalTax: number
  totalCgst: number
  totalSgst: number
  totalIgst: number
  totalDiscount: number
  invoiceCount: number
  sales: SaleWithRelations[]
}

export interface StockReport {
  totalProducts: number
  totalStockValue: number
  totalRetailValue: number
  potentialProfit: number
  lowStockCount: number
  outOfStockCount: number
}

export interface GstReport {
  period: { from: Date; to: Date }
  business: Record<string, string>
  gstByRate: Record<string, { taxable: number; cgst: number; sgst: number; igst: number; count: number }>
  totalTaxable: number
  totalCgst: number
  totalSgst: number
  totalIgst: number
  totalInvoiceCount: number
}

// NextAuth type augmentation
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      tenantId: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    tenantId: string
  }
}
