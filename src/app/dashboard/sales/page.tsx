'use client'

import { useState, useEffect, useRef } from 'react'
import type { Product, SaleWithRelations } from '@/types'
import { csrfFetch } from '@/lib/csrf-client'
import Receipt from '@/components/Receipt'
import Pagination from '@/components/Pagination'

interface CartItem {
  productId: string
  name: string
  sku: string
  hsnCode?: string
  sellingPrice: number
  quantity: number
  discount: number
  gstRate: number
}

interface BundleItem {
  id: string
  name: string
  bundlePrice: number
  discount: number
  items: {
    productId: string
    quantity: number
    product: {
      id: string
      name: string
      sku: string
      sellingPrice: number
      quantity: number
    }
  }[]
}

interface LastSale {
  invoiceNumber: string
  items: { name: string; sku: string; hsnCode?: string; quantity: number; unitPrice: number; discount: number; totalAmount: number; gstRate: number }[]
  subtotal: number
  discount: number
  cgst: number
  sgst: number
  igst: number
  totalTax: number
  totalAmount: number
  paymentMethod: string
  customerName?: string
  customerPhone?: string
  date: string
}

export default function SalesPage() {
  const [products, setProducts] = useState<Pick<Product, 'id' | 'name' | 'sellingPrice' | 'quantity' | 'flavor' | 'category' | 'brand' | 'sku' | 'hsnCode' | 'gstRate'>[]>([])
  const [bundles, setBundles] = useState<BundleItem[]>([])
  const [sales, setSales] = useState<SaleWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })

  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [saleNotes, setSaleNotes] = useState('')

  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const productRef = useRef<HTMLDivElement>(null)

  const [lastSale, setLastSale] = useState<LastSale | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [gstSettings, setGstSettings] = useState({
    gstin: '',
    businessName: '',
    businessAddress: '',
    businessState: '',
    stateCode: '',
    defaultGstRate: '18',
  })

  const loadSales = async (pageNum: number = 1, searchTerm: string = '') => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({ page: String(pageNum), limit: '20' })
      if (searchTerm) params.set('search', searchTerm)
      const res = await fetch(`/api/sales?${params}`)
      if (!res.ok) throw new Error('Failed to fetch sales')
      const data = await res.json()
      setSales(data.data)
      setPagination(data.pagination)
      setPage(pageNum)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        setLoading(true)
        const [productsRes, salesRes, gstRes, bundlesRes] = await Promise.all([
          fetch('/api/products?limit=500'),
          fetch('/api/sales?limit=20'),
          fetch('/api/gst-settings'),
          fetch('/api/bundles'),
        ])
        const productsData = await productsRes.json()
        const salesData = await salesRes.json()
        const gstData = await gstRes.json()
        const bundlesData = await bundlesRes.json()
        if (!cancelled) {
          setProducts(productsData.data || [])
          setBundles(bundlesData.data || [])
          setSales(salesData.data)
          setPagination(salesData.pagination)
          setGstSettings({
            gstin: gstData.gstin || '',
            businessName: gstData.businessName || '',
            businessAddress: gstData.businessAddress || '',
            businessState: gstData.businessState || '',
            stateCode: gstData.stateCode || '',
            defaultGstRate: gstData.defaultGstRate || '18',
          })
        }
      } catch {
        if (!cancelled) setError('Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (productRef.current && !productRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(''), 5000)
    return () => clearTimeout(timer)
  }, [success])

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(''), 8000)
    return () => clearTimeout(timer)
  }, [error])

  const filteredProducts = products.filter(p => {
    if (!productSearch) return true
    const q = productSearch.toLowerCase()
    return p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      (p.flavor && p.flavor.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q)
  })

  const filteredBundles = bundles.filter(b => {
    if (!productSearch) return false
    const q = productSearch.toLowerCase()
    return b.name.toLowerCase().includes(q) ||
      (b.items.some(item => item.product.name.toLowerCase().includes(q)))
  })

  const handleProductKeyDown = (e: React.KeyboardEvent) => {
    if (!showProductDropdown) return
    if (e.key === 'Escape') {
      setShowProductDropdown(false)
    }
  }

  const toggleProduct = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    )
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadSales(1, search)
  }

  const addToCart = () => {
    if (selectedProductIds.length === 0) return

    const newItems: CartItem[] = []
    for (const pid of selectedProductIds) {
      const product = products.find(p => p.id === pid)
      if (!product || product.quantity <= 0) continue

      const existingIndex = cart.findIndex(item => item.productId === pid)
      if (existingIndex >= 0) {
        const updated = [...cart]
        updated[existingIndex].quantity += 1
        setCart(updated)
      } else {
        newItems.push({
          productId: pid,
          name: product.name,
          sku: product.sku || '',
          hsnCode: product.hsnCode || '',
          sellingPrice: Number(product.sellingPrice),
          quantity: 1,
          discount: 0,
          gstRate: product.gstRate || 18,
        })
      }
    }

    if (newItems.length > 0) {
      setCart(prev => [...prev, ...newItems])
    }
    setSelectedProductIds([])
    setProductSearch('')
    setShowProductDropdown(false)
  }

  const addBundleToCart = (bundle: BundleItem) => {
    const newItems: CartItem[] = []
    const bundleItemPrice = bundle.items.length > 0
      ? Number(bundle.bundlePrice) / bundle.items.reduce((sum, item) => sum + item.quantity, 0)
      : 0

    for (const bundleItem of bundle.items) {
      const product = products.find(p => p.id === bundleItem.productId)
      if (!product || product.quantity < bundleItem.quantity) continue

      const existingIndex = cart.findIndex(item => item.productId === bundleItem.productId)
      if (existingIndex >= 0) {
        const updated = [...cart]
        updated[existingIndex].quantity += bundleItem.quantity
        setCart(updated)
      } else {
        newItems.push({
          productId: bundleItem.productId,
          name: product.name,
          sku: product.sku || '',
          hsnCode: product.hsnCode || '',
          sellingPrice: bundleItemPrice || Number(product.sellingPrice),
          quantity: bundleItem.quantity,
          discount: 0,
          gstRate: product.gstRate || 18,
        })
      }
    }

    if (newItems.length > 0) {
      setCart(prev => [...prev, ...newItems])
    }
    setProductSearch('')
    setShowProductDropdown(false)
  }

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity - item.discount), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (cart.length === 0) {
      setError('Please add at least one item to the cart')
      return
    }

    setSubmitting(true)
    try {
      const res = await csrfFetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.sellingPrice,
            discount: item.discount,
          })),
          paymentMethod,
          ...(customerName.trim() ? { customerName: customerName.trim() } : {}),
          ...(saleNotes.trim() ? { notes: saleNotes.trim() } : {}),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create sale')
      }

      const saleResult = await res.json()
      const subtotal = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0)
      const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0)

      const isMulti = saleResult.sales && Array.isArray(saleResult.sales)
      const saleRecords = isMulti ? saleResult.sales : [saleResult]
      const invoiceNumber = isMulti ? saleResult.invoiceNumber : saleResult.invoiceNumber

      let totalTax = 0
      let cgst = 0
      let sgst = 0
      const igst = 0
      for (const item of cart) {
        const preGst = item.sellingPrice * item.quantity - item.discount
        const rate = item.gstRate || 18
        const tax = Math.round(preGst * rate / 100 * 100) / 100
        totalTax += tax
        cgst += Math.round(tax / 2 * 100) / 100
        sgst += Math.round(tax / 2 * 100) / 100
      }

      setLastSale({
        invoiceNumber: invoiceNumber || `SALE-${saleRecords[0]?.id?.slice(0, 8) || 'NEW'}`,
        items: cart.map(item => ({
          name: item.name,
          sku: item.sku,
          hsnCode: item.hsnCode,
          quantity: item.quantity,
          unitPrice: item.sellingPrice,
          discount: item.discount,
          totalAmount: item.sellingPrice * item.quantity - item.discount,
          gstRate: item.gstRate,
        })),
        subtotal,
        discount: totalDiscount,
        cgst,
        sgst,
        igst,
        totalTax,
        totalAmount: subtotal - totalDiscount + totalTax,
        paymentMethod,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        date: new Date().toISOString(),
      })
      setShowReceipt(true)

      setSuccess(`Sale recorded: ${cart.length} item(s), total ₹${cartTotal.toFixed(2)}`)
      setCart([])
      setPaymentMethod('CASH')
      setCustomerName('')
      setCustomerPhone('')
      setSaleNotes('')

      loadSales(page, search)

      const refreshedProducts = await fetch('/api/products?limit=500')
      const refreshedData = await refreshedProducts.json()
      setProducts(refreshedData.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record sale')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">{success}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">New Sale</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Search */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2" ref={productRef}>
              <label className="block text-sm font-medium text-gray-700">Products *</label>
              <div className="relative">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value)
                    setShowProductDropdown(true)
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  onKeyDown={handleProductKeyDown}
                  placeholder="Search and select multiple products..."
                  className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {selectedProductIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedProductIds.map(id => {
                      const p = products.find(pr => pr.id === id)
                      if (!p) return null
                      return (
                        <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                          {p.name}
                          <button type="button" onClick={() => toggleProduct(id)} className="hover:text-indigo-600">✕</button>
                        </span>
                      )
                    })}
                  </div>
                )}
                {showProductDropdown && productSearch && (filteredProducts.length > 0 || filteredBundles.length > 0) && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                    {filteredBundles.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border-b border-gray-100">Bundles</div>
                        {filteredBundles.slice(0, 5).map((b) => (
                          <button
                            key={`bundle-${b.id}`}
                            type="button"
                            onClick={() => addBundleToCart(b)}
                            className="w-full text-left px-3 py-2.5 text-sm border-b border-gray-50 last:border-0 hover:bg-indigo-50 flex items-center gap-3"
                          >
                            <span className="inline-flex items-center px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded">BUNDLE</span>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{b.name}</div>
                              <div className="text-xs text-gray-500 flex gap-2">
                                <span>{b.items.length} items</span>
                                <span>· ₹{Number(b.bundlePrice).toFixed(2)}</span>
                                {Number(b.discount) > 0 && <span className="text-green-600">· {Number(b.discount)}% off</span>}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {filteredProducts.length > 0 && (
                      <div>
                        {filteredBundles.length > 0 && <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">Products</div>}
                        {filteredProducts.slice(0, 20).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleProduct(p.id)}
                            className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-50 last:border-0 hover:bg-gray-50 flex items-center gap-3 ${p.quantity <= 0 ? 'opacity-50' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedProductIds.includes(p.id)}
                              onChange={() => toggleProduct(p.id)}
                              className="h-4 w-4 text-indigo-600 rounded"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{p.name}</div>
                              <div className="text-xs text-gray-500 flex gap-2">
                                <span>{p.brand}</span>
                                {p.flavor && <span>· {p.flavor}</span>}
                                <span>· ₹{Number(p.sellingPrice).toFixed(2)}</span>
                                <span className={p.quantity <= 0 ? 'text-red-500' : 'text-green-600'}>· Stock: {p.quantity}</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {showProductDropdown && productSearch && filteredProducts.length === 0 && filteredBundles.length === 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500">
                    No products found
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={addToCart}
              disabled={selectedProductIds.length === 0}
              className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to Cart ({selectedProductIds.length} selected)
            </button>
          </div>

          {cart.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cart.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-700">₹{item.sellingPrice.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-700">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-right text-gray-700">₹{item.discount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                        ₹{(item.sellingPrice * item.quantity - item.discount).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button type="button" onClick={() => removeFromCart(index)} className="text-red-600 hover:text-red-800 text-sm">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-sm font-bold text-gray-900">Total:</td>
                    <td className="px-4 py-2 text-right text-sm font-bold text-indigo-600">₹{cartTotal.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="CASH">💵 Cash</option>
                <option value="CARD">💳 Card</option>
                <option value="UPI">📱 UPI</option>
                <option value="TRANSFER">🏦 Bank Transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Customer Name (optional)</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Customer Phone (optional)</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="919876543210"
                className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
              <input
                type="text"
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                placeholder="e.g. Walk-in customer"
                className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || cart.length === 0}
              className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing...' : `Record Sale (₹${cartTotal.toFixed(2)})`}
            </button>
          </div>
        </form>
      </div>

      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sales by product name..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Search</button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); loadSales(1, '') }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">Clear</button>
        )}
      </form>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Sales</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">No sales recorded yet</td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-indigo-600">
                      {sale.invoiceNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{Number(sale.totalAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {Number(sale.totalTax) > 0 ? `₹${Number(sale.totalTax).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.paymentMethod}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          const invNo = sale.invoiceNumber || `SALE-${sale.id.slice(0, 8)}`
                          const invoiceSales = sales.filter(s => (s.invoiceNumber || `SALE-${s.id.slice(0, 8)}`) === invNo)
                          const items = invoiceSales.map(s => ({
                            name: s.product.name,
                            sku: s.product.sku || '',
                            hsnCode: s.product.hsnCode || '',
                            quantity: s.quantity,
                            unitPrice: Number(s.unitPrice),
                            discount: Number(s.discount),
                            totalAmount: Number(s.totalAmount),
                            gstRate: s.product.gstRate || 18,
                          }))
                          setLastSale({
                            invoiceNumber: invNo,
                            items,
                            subtotal: items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0),
                            discount: items.reduce((sum, it) => sum + it.discount, 0),
                            cgst: invoiceSales.reduce((sum, s) => sum + Number(s.cgst), 0),
                            sgst: invoiceSales.reduce((sum, s) => sum + Number(s.sgst), 0),
                            igst: invoiceSales.reduce((sum, s) => sum + Number(s.igst), 0),
                            totalTax: invoiceSales.reduce((sum, s) => sum + Number(s.totalTax), 0),
                            totalAmount: invoiceSales.reduce((sum, s) => sum + Number(s.totalAmount), 0),
                            paymentMethod: sale.paymentMethod,
                            customerName: sale.customerName || sale.customer?.name || undefined,
                            customerPhone: sale.customer?.phone || undefined,
                            date: sale.createdAt,
                          })
                          setShowReceipt(true)
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Print
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={page}
        pages={pagination.pages}
        total={pagination.total}
        onPageChange={(p) => loadSales(p, search)}
      />

      {showReceipt && lastSale && (
        <Receipt
          invoiceNumber={lastSale.invoiceNumber}
          items={lastSale.items}
          subtotal={lastSale.subtotal}
          discount={lastSale.discount}
          cgst={lastSale.cgst}
          sgst={lastSale.sgst}
          igst={lastSale.igst}
          totalAmount={lastSale.totalAmount}
          paymentMethod={lastSale.paymentMethod}
          customerName={lastSale.customerName}
          customerPhone={lastSale.customerPhone}
          businessName={gstSettings.businessName || 'SupplementShop Pro'}
          businessAddress={gstSettings.businessAddress}
          businessGstin={gstSettings.gstin}
          businessState={gstSettings.businessState}
          businessStateCode={gstSettings.stateCode}
          date={lastSale.date}
          onClose={() => { setShowReceipt(false); setLastSale(null) }}
        />
      )}
    </div>
  )
}
