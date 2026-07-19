'use client'

import { useState, useEffect } from 'react'
import type { Product } from '@/types'
import { formatCurrency } from '@/utils'
import { csrfFetch } from '@/lib/csrf-client'

interface BundleItem {
  id: string
  productId: string
  quantity: number
  product: { id: string; name: string; sku: string; sellingPrice: number; quantity: number }
}

interface Bundle {
  id: string
  name: string
  description: string | null
  bundlePrice: number
  discount: number
  isActive: boolean
  items: BundleItem[]
  createdAt: string
}

export default function BundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [products, setProducts] = useState<Pick<Product, 'id' | 'name' | 'sku' | 'sellingPrice' | 'quantity'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bundlePrice: 0,
    discount: 0,
    items: [] as { productId: string; quantity: number }[],
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const [bundlesRes, productsRes] = await Promise.all([
          fetch('/api/bundles'),
          fetch('/api/products?limit=500'),
        ])
        const bundlesData = await bundlesRes.json()
        const productsData = await productsRes.json()
        if (!cancelled) {
          setBundles(bundlesData.data || [])
          setProducts(productsData.data || [])
        }
      } catch {
        if (!cancelled) setError('Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [bundlesRes, productsRes] = await Promise.all([
        fetch('/api/bundles'),
        fetch('/api/products?limit=500'),
      ])
      const bundlesData = await bundlesRes.json()
      const productsData = await productsRes.json()
      setBundles(bundlesData.data || [])
      setProducts(productsData.data || [])
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 1 }],
    })
  }

  const updateItem = (index: number, field: string, value: string | number) => {
    const updated = [...formData.items]
    if (field === 'productId') updated[index].productId = value as string
    if (field === 'quantity') updated[index].quantity = value as number
    setFormData({ ...formData, items: updated })
  }

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name.trim()) {
      setError('Bundle name is required')
      return
    }
    if (formData.items.length === 0) {
      setError('Add at least one item')
      return
    }
    if (formData.items.some(item => !item.productId)) {
      setError('Select a product for each item')
      return
    }

    try {
      const payload = editingBundle
        ? { id: editingBundle.id, ...formData }
        : formData

      const res = await csrfFetch('/api/bundles', {
        method: editingBundle ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save bundle')
      }

      setSuccess(editingBundle ? 'Bundle updated' : 'Bundle created')
      setShowModal(false)
      setEditingBundle(null)
      setFormData({ name: '', description: '', bundlePrice: 0, discount: 0, items: [] })
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  const handleEdit = (bundle: Bundle) => {
    setEditingBundle(bundle)
    setFormData({
      name: bundle.name,
      description: bundle.description || '',
      bundlePrice: Number(bundle.bundlePrice),
      discount: Number(bundle.discount),
      items: bundle.items.map(item => ({ productId: item.productId, quantity: item.quantity })),
    })
    setShowModal(true)
  }

  const handleDelete = async (bundle: Bundle) => {
    if (!window.confirm(`Delete bundle "${bundle.name}"?`)) return
    try {
      const res = await csrfFetch(`/api/bundles?id=${bundle.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setSuccess('Bundle deleted')
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const calculateTotalPrice = (items: { productId: string; quantity: number }[]) => {
    return items.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId)
      return sum + (product ? Number(product.sellingPrice) * item.quantity : 0)
    }, 0)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Bundles</h1>
          <p className="text-sm text-gray-500 mt-1">Create combo packs (Bulking, Cutting, Recovery stacks)</p>
        </div>
        <button
          onClick={() => { setEditingBundle(null); setFormData({ name: '', description: '', bundlePrice: 0, discount: 0, items: [] }); setShowModal(true); }}
          className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Create Bundle
        </button>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">{success}</div>}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : bundles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No bundles yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create your first bundle to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bundles.map((bundle) => {
            const totalPrice = calculateTotalPrice(bundle.items)
            const savings = totalPrice - Number(bundle.bundlePrice)
            const savingsPercent = totalPrice > 0 ? (savings / totalPrice) * 100 : 0

            return (
              <div key={bundle.id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{bundle.name}</h3>
                    {bundle.description && (
                      <p className="text-sm text-gray-500 mt-1">{bundle.description}</p>
                    )}
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {bundle.items.length} items
                  </span>
                </div>

                <div className="space-y-1.5 mb-4">
                  {bundle.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.product.name} x{item.quantity}</span>
                      <span className="text-gray-500">{formatCurrency(Number(item.product.sellingPrice) * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="text-sm text-gray-500 line-through">{formatCurrency(totalPrice)}</span>
                      <span className="ml-2 text-lg font-bold text-indigo-600">{formatCurrency(Number(bundle.bundlePrice))}</span>
                    </div>
                    {savings > 0 && (
                      <span className="text-sm font-medium text-green-600">
                        Save {savingsPercent.toFixed(0)}% ({formatCurrency(savings)})
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(bundle)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(bundle)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingBundle ? 'Edit Bundle' : 'Create Bundle'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bundle Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. Bulking Stack"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bundle Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.bundlePrice}
                      onChange={(e) => setFormData({ ...formData, bundlePrice: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Items *</label>
                    <button type="button" onClick={addItem} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                      + Add Item
                    </button>
                  </div>
                  {formData.items.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center border border-dashed rounded-lg">
                      No items added yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {formData.items.map((item, index) => (
                        <div key={index} className="flex gap-2">
                          <select
                            value={item.productId}
                            onChange={(e) => updateItem(index, 'productId', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Select product</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} - {formatCurrency(p.sellingPrice)}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="px-3 py-2 text-red-600 hover:text-red-800"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      {formData.items.length > 0 && (
                        <p className="text-sm text-gray-500 mt-2">
                          Individual total: {formatCurrency(calculateTotalPrice(formData.items))}
                          {formData.bundlePrice > 0 && (
                            <span className="ml-2 text-green-600 font-medium">
                              Save {formatCurrency(calculateTotalPrice(formData.items) - formData.bundlePrice)}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                    {editingBundle ? 'Update' : 'Create'} Bundle
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
