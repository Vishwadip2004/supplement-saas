import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function generateSKU(category: string, id: number): string {
  const prefix = category.slice(0, 3).toUpperCase()
  return `${prefix}-${String(id).padStart(5, '0')}`
}

export function calculateProfit(purchasePrice: number, sellingPrice: number): number {
  return sellingPrice - purchasePrice
}

export function calculateProfitMargin(purchasePrice: number, sellingPrice: number): number {
  if (purchasePrice === 0) return sellingPrice > 0 ? Infinity : 0
  return ((sellingPrice - purchasePrice) / purchasePrice) * 100
}

export function isExpiringSoon(expiryDate: Date | string, daysThreshold: number = 30): boolean {
  const expiry = new Date(expiryDate)
  const now = new Date()
  const threshold = new Date()
  threshold.setDate(now.getDate() + daysThreshold)
  return expiry > now && expiry <= threshold
}

export function isLowStock(quantity: number, minStock: number): boolean {
  return quantity <= minStock
}
