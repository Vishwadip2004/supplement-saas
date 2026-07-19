'use client'

import { useState, useEffect, useRef } from 'react'
import type { Product, Customer, SaleWithRelations } from '@/types'
import { csrfFetch } from '@/lib/csrf-client'

interface CartItem {
  productId: string
  name: string
  sellingPrice: number
  quantity: number
  discount: number
}

export default function SalesPage() {
  const [products, setProducts] = useState<Pick<Product, 'id' | 'name' | 'sellingPrice' | 'quantity' | 'flavor' | 'category' | 'brand'>[]>([])
  const [customers, setCustomers] = useState<Pick<Customer, 'id' | 'name' | 'phone'>[]>([])
  const [sales, setSales] = useState<SaleWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })

  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [selectedDiscount, setDiscount] = useState(0)
  const [customerId, setCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')

  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [productHighlight, setProductHighlight] = useState(-1)
  const productRef = useRef<HTMLDivElement>(null)

  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [customerHighlight, setCustomerHighlight] = useState(-1)
  const customerRef = useRef<HTMLDivElement>(null)

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
        const [productsRes, customersRes, salesRes] = await Promise.all([
          fetch('/api/products?limit=500'),
          fetch('/api/customers?limit=500'),
          fetch('/api/sales?limit=20'),
        ])
        const productsData = await productsRes.json()
        const customersData = await customersRes.json()
        const salesData = await salesRes.json()
        if (!cancelled) {
          setProducts(productsData.data || [])
          setCustomers(customersData.data || [])
          setSales(salesData.data)
          setPagination(salesData.pagination)
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
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredProducts = products.filter(p => {
    if (!productSearch) return true
    const q = productSearch.toLowerCase()
    return p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      (p.flavor && p.flavor.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q)
  })

  const filteredCustomers = customers.filter(c => {
    if (!customerSearch) return true
    const q = customerSearch.toLowerCase()
    return c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q))
  })

  const handleProductKeyDown = (e: React.KeyboardEvent) => {
    if (!showProductDropdown) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setProductHighlight(prev => Math.min(prev + 1, filteredProducts.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setProductHighlight(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && productHighlight >= 0) {
      e.preventDefault()
      const p = filteredProducts[productHighlight]
      if (p) selectProduct(p)
    } else if (e.key === 'Escape') {
      setShowProductDropdown(false)
    }
  }

  const handleCustomerKeyDown = (e: React.KeyboardEvent) => {
    if (!showCustomerDropdown) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCustomerHighlight(prev => Math.min(prev + 1, filteredCustomers.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCustomerHighlight(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && customerHighlight >= 0) {
      e.preventDefault()
      const c = filteredCustomers[customerHighlight]
      if (c) selectCustomer(c)
    } else if (e.key === 'Escape') {
      setShowCustomerDropdown(false)
    }
  }

  const selectProduct = (product: Pick<Product, 'id' | 'name' | 'sellingPrice' | 'quantity' | 'flavor' | 'category' | 'brand'>) => {
    setSelectedProductId(product.id)
    setProductSearch('')
    setShowProductDropdown(false)
    setProductHighlight(-1)
  }

  const selectCustomer = (customer: Pick<Customer, 'id' | 'name' | 'phone'>) => {
    setCustomerId(customer.id)
    setCustomerSearch(`${customer.name}${customer.phone ? ` (${customer.phone})` : ''}`)
    setShowCustomerDropdown(false)
    setCustomerHighlight(-1)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadSales(1, search)
  }

  const addToCart = () => {
    if (!selectedProductId) return
    const product = products.find((p) => p.id === selectedProductId)
    if (!product) return

    const existingIndex = cart.findIndex((item) => item.productId === selectedProductId)
    if (existingIndex >= 0) {
      const updated = [...cart]
      updated[existingIndex].quantity += selectedQuantity
      setCart(updated)
    } else {
      setCart([...cart, {
        productId: selectedProductId,
        name: product.name,
        sellingPrice: Number(product.sellingPrice),
        quantity: selectedQuantity,
        discount: selectedDiscount,
      }])
    }
    setSelectedProductId('')
    setSelectedQuantity(1)
    setDiscount(0)
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
          customerId: customerId || undefined,
          paymentMethod,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create sale')
      }

      setSuccess(`Sale recorded: ${cart.length} item(s), total ₹${cartTotal.toFixed(2)}`)
      setCart([])
      setCustomerId('')
      setCustomerSearch('')
      setPaymentMethod('CASH')

      loadSales(page, search)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record sale')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedProduct = products.find(p => p.id === selectedProductId)

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2" ref={productRef}>
              <label className="block text-sm font-medium text-gray-700">Product *</label>
              <div className="relative">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value)
                    setShowProductDropdown(true)
                    setProductHighlight(-1)
                    if (!e.target.value) setSelectedProductId('')
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  onKeyDown={handleProductKeyDown}
                  placeholder="Search product by name, brand, flavor..."
                  className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {selectedProduct && !productSearch && (
                  <div className="mt-1 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-700 flex items-center justify-between">
                    <span>{selectedProduct.name}{selectedProduct.flavor ? ` (${selectedProduct.flavor})` : ''} - ₹{Number(selectedProduct.sellingPrice).toFixed(2)}</span>
                    <button type="button" onClick={() => { setSelectedProductId(''); setProductSearch('') }} className="text-indigo-500 hover:text-indigo-700 ml-2">✕</button>
                  </div>
                )}
                {showProductDropdown && productSearch && filteredProducts.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {filteredProducts.slice(0, 20).map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectProduct(p)}
                        onMouseEnter={() => setProductHighlight(i)}
                        className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-50 last:border-0 ${
                          i === productHighlight ? 'bg-indigo-50' : 'hover:bg-gray-50'
                        } ${p.quantity <= 0 ? 'opacity-50' : ''}`}
                      >
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500 flex gap-2">
                          <span>{p.brand}</span>
                          {p.flavor && <span>· {p.flavor}</span>}
                          <span>· ₹{Number(p.sellingPrice).toFixed(2)}</span>
                          <span className={p.quantity <= 0 ? 'text-red-500' : 'text-green-600'}>· Stock: {p.quantity}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showProductDropdown && productSearch && filteredProducts.length === 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500">
                    No products found
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Qty</label>
              <input
                type="number"
                min="1"
                value={selectedQuantity}
                onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
                className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Discount (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={selectedDiscount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={addToCart}
                disabled={!selectedProductId}
                className="w-full px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Cart
              </button>
            </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Search */}
            <div ref={customerRef}>
              <label className="block text-sm font-medium text-gray-700">Customer (Optional)</label>
              <div className="relative">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value)
                    setShowCustomerDropdown(true)
                    setCustomerHighlight(-1)
                    if (!e.target.value) setCustomerId('')
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onKeyDown={handleCustomerKeyDown}
                  placeholder="Search customer by name or phone..."
                  className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { setCustomerId(''); setCustomerSearch(''); setShowCustomerDropdown(false) }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 text-gray-500"
                    >
                      Walk-in customer
                    </button>
                    {filteredCustomers.slice(0, 15).map((c, i) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        onMouseEnter={() => setCustomerHighlight(i)}
                        className={`w-full text-left px-3 py-2 text-sm border-b border-gray-50 last:border-0 ${
                          i === customerHighlight ? 'bg-indigo-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{c.name}</div>
                        {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No sales recorded yet</td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.customer?.name || 'Walk-in'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{Number(sale.totalAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sale.paymentMethod}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-700">Showing page {page} of {pagination.pages} ({pagination.total} total)</p>
          <div className="flex gap-2">
            <button onClick={() => loadSales(page - 1, search)} disabled={page <= 1} className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(page - 2, pagination.pages - 4)) + i
              if (pageNum > pagination.pages) return null
              return (
                <button key={pageNum} onClick={() => loadSales(pageNum, search)} className={`px-3 py-1 text-sm border rounded-lg ${pageNum === page ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 hover:bg-gray-50'}`}>{pageNum}</button>
              )
            })}
            <button onClick={() => loadSales(page + 1, search)} disabled={page >= pagination.pages} className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
