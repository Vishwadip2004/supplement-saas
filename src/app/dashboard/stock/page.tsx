'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { csrfFetch } from '@/lib/csrf-client'

interface Product { id: string; name: string; sku: string; quantity: number }
interface StockMovement {
  id: string
  productId: string
  quantity: number
  type: string
  reference: string | null
  notes: string | null
  createdAt: string
  product: { name: string; sku: string }
}

const typeColors: Record<string, string> = {
  IN: 'bg-green-100 text-green-800',
  OUT: 'bg-red-100 text-red-800',
  ADJUSTMENT: 'bg-blue-100 text-blue-800',
}

export default function StockPage() {
  const { data: session } = useSession()
  const canManage = ['ADMIN', 'MANAGER'].includes(session?.user?.role || '')
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ productId: '', quantity: 1, type: 'IN' as 'IN' | 'OUT' | 'ADJUSTMENT', reference: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [typeFilter, setTypeFilter] = useState('')

  const loadMovements = useCallback(async (pageNum: number) => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({ page: String(pageNum), limit: '20' })
      if (typeFilter) params.set('type', typeFilter)
      const res = await fetch(`/api/stock-movements?${params}`)
      if (!res.ok) throw new Error('Failed to fetch stock movements')
      const data = await res.json()
      setMovements(data.data)
      setPagination(data.pagination)
      setPage(pageNum)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock movements')
    } finally {
      setLoading(false)
    }
  }, [typeFilter])

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const [movRes, prodRes] = await Promise.all([
          fetch('/api/stock-movements?limit=20'),
          fetch('/api/products?limit=100'),
        ])
        if (movRes.ok && !cancelled) {
          const data = await movRes.json()
          setMovements(data.data)
          setPagination(data.pagination)
        }
        if (prodRes.ok && !cancelled) {
          const data = await prodRes.json()
          setProducts(data.data)
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
    let cancelled = false
    async function fetchMovements() {
      try {
        setLoading(true)
        setError('')
        const params = new URLSearchParams({ page: '1', limit: '20' })
        if (typeFilter) params.set('type', typeFilter)
        const res = await fetch(`/api/stock-movements?${params}`)
        if (!res.ok) throw new Error('Failed to fetch stock movements')
        const data = await res.json()
        if (!cancelled) {
          setMovements(data.data)
          setPagination(data.pagination)
          setPage(1)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to fetch stock movements')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchMovements()
    return () => { cancelled = true }
  }, [typeFilter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await csrfFetch('/api/stock-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create stock movement')
      }
      setShowModal(false)
      setFormData({ productId: '', quantity: 1, type: 'IN', reference: '', notes: '' })
      setSuccess('Stock movement recorded successfully')
      loadMovements(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create stock movement')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedProduct = products.find((p) => p.id === formData.productId)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stock Movements</h1>
        {canManage && (
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Record Movement
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}
      {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>}

      <div className="mb-4">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Types</option>
          <option value="IN">Stock In</option>
          <option value="OUT">Stock Out</option>
          <option value="ADJUSTMENT">Adjustment</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : movements.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No stock movements found</div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(m.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {m.product.name}
                    <span className="ml-1 text-gray-400 text-xs">({m.product.sku})</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeColors[m.type] || 'bg-gray-100'}`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <span className={m.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{m.reference || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">{m.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
              <button onClick={() => loadMovements(page - 1)} disabled={page <= 1} className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50">Previous</button>
              <span className="text-sm text-gray-600">Page {page} of {pagination.pages}</span>
              <button onClick={() => loadMovements(page + 1)} disabled={page >= pagination.pages} className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50">Next</button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Record Stock Movement</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product</label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku}) - Stock: {p.quantity}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'IN' | 'OUT' | 'ADJUSTMENT' })}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="IN">Stock In</option>
                    <option value="OUT">Stock Out</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    min={1}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                  {selectedProduct && (
                    <p className="mt-1 text-sm text-gray-500">
                      Current stock: {selectedProduct.quantity} | After: {formData.type === 'IN'
                        ? selectedProduct.quantity + formData.quantity
                        : selectedProduct.quantity - formData.quantity}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Reference</label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g. PO-12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 hover:text-gray-900">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {submitting ? 'Recording...' : 'Record Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
