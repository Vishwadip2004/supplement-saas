'use client'

import { useState, useEffect } from 'react'

interface Product {
  id: string
  name: string
  sellingPrice: number
  quantity: number
}

interface Customer {
  id: string
  name: string
}

interface Sale {
  id: string
  createdAt: string
  product: { name: string }
  customer: { name: string } | null
  quantity: number
  totalAmount: number
  paymentMethod: string
}

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })

  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [customerId, setCustomerId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [discount, setDiscount] = useState(0)

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
          fetch('/api/products'),
          fetch('/api/customers'),
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadSales(1, search)
  }

  const selectedProduct = products.find((p) => p.id === productId)
  const total = selectedProduct
    ? Number(selectedProduct.sellingPrice) * quantity - discount
    : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!productId) {
      setError('Please select a product')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity,
          unitPrice: selectedProduct?.sellingPrice || 0,
          customerId: customerId || undefined,
          paymentMethod,
          discount,
        }),
      })

      if (!res.ok) throw new Error('Failed to create sale')

      setSuccess('Sale recorded successfully')
      setProductId('')
      setQuantity(1)
      setCustomerId('')
      setPaymentMethod('CASH')
      setDiscount(0)

      loadSales(page, search)
    } catch {
      setError('Failed to record sale')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg
          className="animate-spin h-8 w-8 text-indigo-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">New Sale</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="product"
                className="block text-sm font-medium text-gray-700"
              >
                Product *
              </label>
              <select
                id="product"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select a product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - ₹{Number(p.sellingPrice).toFixed(2)} (Stock: {p.quantity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="quantity"
                className="block text-sm font-medium text-gray-700"
              >
                Quantity
              </label>
              <input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="customer"
                className="block text-sm font-medium text-gray-700"
              >
                Customer (Optional)
              </label>
              <select
                id="customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Walk-in customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="paymentMethod"
                className="block text-sm font-medium text-gray-700"
              >
                Payment Method
              </label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="TRANSFER">Transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="discount"
                className="block text-sm font-medium text-gray-700"
              >
                Discount (Optional)
              </label>
              <input
                id="discount"
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-end">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700">
                  Total
                </label>
                <div className="mt-1 px-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-lg font-bold text-gray-900">
                  ₹{total.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing...' : 'Record Sale'}
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
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); loadSales(1, '') }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Sales
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No sales recorded yet
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.customer?.name || 'Walk-in'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{Number(sale.totalAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.paymentMethod}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing page {page} of {pagination.pages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => loadSales(page - 1, search)}
              disabled={page <= 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(page - 2, pagination.pages - 4)) + i
              if (pageNum > pagination.pages) return null
              return (
                <button
                  key={pageNum}
                  onClick={() => loadSales(pageNum, search)}
                  className={`px-3 py-1 text-sm border rounded-lg ${
                    pageNum === page
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => loadSales(page + 1, search)}
              disabled={page >= pagination.pages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
