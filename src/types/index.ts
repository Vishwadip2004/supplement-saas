// User types
export interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'MANAGER' | 'STAFF'
  isActive: boolean
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}

// Product types
export interface Product {
  id: string
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

// Dashboard Stats
export interface DashboardStats {
  totalProducts: number
  lowStock: number
  expiringSoon: number
  todaySales: number
  totalRevenue: number
  totalCustomers: number
}
