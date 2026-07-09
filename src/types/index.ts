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
  purchasePrice: number
  sellingPrice: number
  quantity: number
  minStock: number
  expiryDate?: Date
  batchNumber?: string
  storageLocation?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Customer types
export interface Customer {
  id: string
  tenantId: string
  name: string
  email?: string
  phone?: string
  address?: string
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
  quantity: number
  unitPrice: number
  discount: number
  totalAmount: number
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER'
  notes?: string
  createdAt: Date
}

// Stock Movement types
export interface StockMovement {
  id: string
  tenantId: string
  productId: string
  quantity: number
  type: 'IN' | 'OUT' | 'ADJUSTMENT'
  reference?: string
  notes?: string
  createdAt: Date
}

// Purchase Order types
export interface PurchaseOrder {
  id: string
  tenantId: string
  supplierId: string
  status: 'PENDING' | 'APPROVED' | 'RECEIVED' | 'CANCELLED'
  totalAmount: number
  notes?: string
  createdAt: Date
  updatedAt: Date
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
  totalCustomers: number
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
  quantity: number
  unitPrice: number
  discount: number
  totalAmount: number
  paymentMethod: string
  notes?: string | null
  createdAt: string
  product: { name: string; sellingPrice: number }
  customer: { name: string } | null
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
