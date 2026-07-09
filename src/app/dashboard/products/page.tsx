'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import type { Product } from '@/types'
import { formatCurrency, formatDate } from '@/utils'

interface ProductFormData {
  name: string
  sku: string
  barcode: string
  description: string
  category: string
  brand: string
  purchasePrice: number
  sellingPrice: number
  quantity: number
  minStock: number
  expiryDate: string
  batchNumber: string
  storageLocation: string
}

const defaultFormData: ProductFormData = {
  name: '',
  sku: '',
  barcode: '',
  description: '',
  category: '',
  brand: '',
  purchasePrice: 0,
  sellingPrice: 0,
  quantity: 0,
  minStock: 10,
  expiryDate: '',
  batchNumber: '',
  storageLocation: '',
}

export default function ProductsPage() {
  const { data: session } = useSession()
  const canManage = ['ADMIN', 'MANAGER'].includes(session?.user?.role || '')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })

  const loadProducts = async (pageNum: number = 1, searchTerm: string = '') => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({ page: String(pageNum), limit: '20' })
      if (searchTerm) params.set('search', searchTerm)
      const res = await fetch(`/api/products?${params}`)
      if (!res.ok) throw new Error('Failed to fetch products')
      const data = await res.json()
      setProducts(data.data)
      setPagination(data.pagination)
      setPage(pageNum)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        setLoading(true)
        const res = await fetch('/api/products?limit=20')
        if (!res.ok) throw new Error('Failed to fetch products')
        const data = await res.json()
        if (!cancelled) {
          setProducts(data.data)
          setPagination(data.pagination)
        }
      } catch {
        if (!cancelled) setError('Failed to fetch products')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadProducts(1, search)
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = 'Product name is required'
    if (!formData.sku.trim()) errors.sku = 'SKU is required'
    if (!formData.category.trim()) errors.category = 'Category is required'
    if (!formData.brand.trim()) errors.brand = 'Brand is required'
    if (!formData.purchasePrice || formData.purchasePrice <= 0) {
      errors.purchasePrice = 'Purchase price must be positive'
    }
    if (!formData.sellingPrice || formData.sellingPrice <= 0) {
      errors.sellingPrice = 'Selling price must be positive'
    }
    if (formData.quantity < 0) errors.quantity = 'Quantity cannot be negative'
    if (formData.minStock < 0) errors.minStock = 'Minimum stock cannot be negative'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        category: formData.category.trim(),
        brand: formData.brand.trim(),
        purchasePrice: Number(formData.purchasePrice),
        sellingPrice: Number(formData.sellingPrice),
        quantity: Number(formData.quantity),
        minStock: Number(formData.minStock),
      }

      if (formData.barcode.trim()) payload.barcode = formData.barcode.trim()
      if (formData.description.trim()) payload.description = formData.description.trim()
      if (formData.expiryDate) payload.expiryDate = formData.expiryDate
      if (formData.batchNumber.trim()) payload.batchNumber = formData.batchNumber.trim()
      if (formData.storageLocation.trim()) payload.storageLocation = formData.storageLocation.trim()

      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save product')
      }

      setSuccess(editingProduct ? 'Product updated successfully' : 'Product created successfully')
      setShowModal(false)
      setEditingProduct(null)
      setFormData(defaultFormData)

      loadProducts(page, search)

      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      description: product.description || '',
      category: product.category,
      brand: product.brand,
      purchasePrice: Number(product.purchasePrice),
      sellingPrice: Number(product.sellingPrice),
      quantity: Number(product.quantity),
      minStock: Number(product.minStock),
      expiryDate: product.expiryDate
        ? new Date(product.expiryDate).toISOString().split('T')[0]
        : '',
      batchNumber: product.batchNumber || '',
      storageLocation: product.storageLocation || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return
    }

    try {
      setError('')
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete product')
      }

      setSuccess('Product deleted successfully')

      loadProducts(page, search)

      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product')
    }
  }

  const openAddModal = () => {
    setEditingProduct(null)
    setFormData(defaultFormData)
    setFormErrors({})
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingProduct(null)
    setFormData(defaultFormData)
    setFormErrors({})
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: ['purchasePrice', 'sellingPrice', 'quantity', 'minStock'].includes(name)
        ? Number(value)
        : value,
    }))
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const formatProductDate = (date: Date | string | null | undefined) => {
    if (!date) return '-'
    return formatDate(date)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">Manage your product inventory</p>
        </div>
        {canManage && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add Product
          </button>
        )}
      </div>

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

      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products by name, SKU, category, or brand..."
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
            onClick={() => { setSearch(''); loadProducts(1, '') }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-12 flex items-center justify-center">
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
          <span className="ml-3 text-gray-600">Loading products...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding a new product.
          </p>
          <div className="mt-6">
            {canManage && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add Product
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {product.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{product.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{product.brand}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(product.sellingPrice)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.quantity <= product.minStock
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {product.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className={`text-sm ${
                          product.expiryDate &&
                          new Date(product.expiryDate) < new Date()
                            ? 'text-red-600 font-medium'
                            : 'text-gray-500'
                        }`}
                      >
                        {formatProductDate(product.expiryDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {canManage && (
                        <>
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(product)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing page {page} of {pagination.pages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => loadProducts(page - 1, search)}
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
                  onClick={() => loadProducts(pageNum, search)}
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
              onClick={() => loadProducts(page + 1, search)}
              disabled={page >= pagination.pages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={closeModal}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingProduct ? 'Edit Product' : 'Add Product'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        formErrors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Product name"
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      SKU *
                    </label>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        formErrors.sku ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="SKU-001"
                    />
                    {formErrors.sku && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.sku}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Barcode
                    </label>
                    <input
                      type="text"
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Barcode"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Category *
                    </label>
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        formErrors.category ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="e.g. Protein, Vitamins"
                    />
                    {formErrors.category && (
                      <p className="mt-1 text-sm text-red-600">
                        {formErrors.category}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Brand *
                    </label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        formErrors.brand ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Brand name"
                    />
                    {formErrors.brand && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.brand}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Purchase Price *
                    </label>
                    <input
                      type="number"
                      name="purchasePrice"
                      value={formData.purchasePrice}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        formErrors.purchasePrice
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                    />
                    {formErrors.purchasePrice && (
                      <p className="mt-1 text-sm text-red-600">
                        {formErrors.purchasePrice}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Selling Price *
                    </label>
                    <input
                      type="number"
                      name="sellingPrice"
                      value={formData.sellingPrice}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        formErrors.sellingPrice
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                    />
                    {formErrors.sellingPrice && (
                      <p className="mt-1 text-sm text-red-600">
                        {formErrors.sellingPrice}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Quantity
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      min="0"
                      className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        formErrors.quantity ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="0"
                    />
                    {formErrors.quantity && (
                      <p className="mt-1 text-sm text-red-600">
                        {formErrors.quantity}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Min Stock
                    </label>
                    <input
                      type="number"
                      name="minStock"
                      value={formData.minStock}
                      onChange={handleChange}
                      min="0"
                      className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        formErrors.minStock ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="10"
                    />
                    {formErrors.minStock && (
                      <p className="mt-1 text-sm text-red-600">
                        {formErrors.minStock}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Batch Number
                    </label>
                    <input
                      type="text"
                      name="batchNumber"
                      value={formData.batchNumber}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Batch number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Storage Location
                    </label>
                    <input
                      type="text"
                      name="storageLocation"
                      value={formData.storageLocation}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g. Shelf A3"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Product description"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? (
                      <span className="flex items-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                        Saving...
                      </span>
                    ) : editingProduct ? (
                      'Update Product'
                    ) : (
                      'Create Product'
                    )}
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
