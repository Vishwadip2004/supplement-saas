'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { Product } from '@/types'
import { formatCurrency } from '@/utils'
import { csrfFetch } from '@/lib/csrf-client'

interface ProductFormData {
  name: string
  sku: string
  barcode: string
  description: string
  category: string
  brand: string
  flavor: string
  purchasePrice: number
  sellingPrice: number
  quantity: number
  minStock: number
  expiryDate: string
  batchNumber: string
  storageLocation: string
}

interface CategoryItem {
  id: string
  name: string
  emoji: string
  color: string
  sortOrder: number
}

const defaultFormData: ProductFormData = {
  name: '',
  sku: '',
  barcode: '',
  description: '',
  category: '',
  brand: '',
  flavor: '',
  purchasePrice: 0,
  sellingPrice: 0,
  quantity: 0,
  minStock: 10,
  expiryDate: '',
  batchNumber: '',
  storageLocation: '',
}

const CATEGORY_EMOJI: Record<string, string> = {
  'Whey Protein': '💪',
  'Plant Protein': '🌱',
  'Pre-Workout': '⚡',
  'Creatine': '🔋',
  'BCAA & Amino Acids': '🧬',
  'Mass Gainer': '🏋️',
  'Fat Burner': '🔥',
  'Vitamins & Minerals': '💊',
  'Fish Oil & Omega': '🐟',
  'Joint Support': '🦴',
  'Probiotics & Digestive': '🦠',
  'Collagen': '✨',
  'Sleep & Relaxation': '😴',
  'Testosterone & Hormone': '⚖️',
  'Hydration & Electrolytes': '💧',
  'Greens & Superfoods': '🥬',
  'Pump & Nitric Oxide': '💦',
  'Performance & Endurance': '🏃',
  'Health': '❤️',
  'Recovery': '🩹',
}

const CATEGORY_COLORS: Record<string, string> = {
  'Whey Protein': 'from-blue-500 to-blue-700',
  'Plant Protein': 'from-green-500 to-green-700',
  'Pre-Workout': 'from-orange-500 to-red-600',
  'Creatine': 'from-purple-500 to-purple-700',
  'BCAA & Amino Acids': 'from-teal-500 to-teal-700',
  'Mass Gainer': 'from-amber-500 to-amber-700',
  'Fat Burner': 'from-red-500 to-rose-700',
  'Vitamins & Minerals': 'from-yellow-500 to-yellow-700',
  'Fish Oil & Omega': 'from-sky-500 to-sky-700',
  'Joint Support': 'from-stone-500 to-stone-700',
  'Probiotics & Digestive': 'from-lime-500 to-lime-700',
  'Collagen': 'from-pink-500 to-pink-700',
  'Sleep & Relaxation': 'from-indigo-500 to-indigo-700',
  'Testosterone & Hormone': 'from-slate-500 to-slate-700',
  'Hydration & Electrolytes': 'from-cyan-500 to-cyan-700',
  'Greens & Superfoods': 'from-emerald-500 to-emerald-700',
  'Pump & Nitric Oxide': 'from-violet-500 to-violet-700',
  'Performance & Endurance': 'from-fuchsia-500 to-fuchsia-700',
  'Health': 'from-rose-400 to-rose-600',
  'Recovery': 'from-orange-400 to-orange-600',
}

const CATEGORY_PILL_COLORS: Record<string, string> = {
  'Whey Protein': 'bg-blue-100 text-blue-800',
  'Plant Protein': 'bg-green-100 text-green-800',
  'Pre-Workout': 'bg-orange-100 text-orange-800',
  'Creatine': 'bg-purple-100 text-purple-800',
  'BCAA & Amino Acids': 'bg-teal-100 text-teal-800',
  'Mass Gainer': 'bg-amber-100 text-amber-800',
  'Fat Burner': 'bg-red-100 text-red-800',
  'Vitamins & Minerals': 'bg-yellow-100 text-yellow-800',
  'Fish Oil & Omega': 'bg-sky-100 text-sky-800',
  'Joint Support': 'bg-stone-100 text-stone-800',
  'Probiotics & Digestive': 'bg-lime-100 text-lime-800',
  'Collagen': 'bg-pink-100 text-pink-800',
  'Sleep & Relaxation': 'bg-indigo-100 text-indigo-800',
  'Testosterone & Hormone': 'bg-slate-100 text-slate-800',
  'Hydration & Electrolytes': 'bg-cyan-100 text-cyan-800',
  'Greens & Superfoods': 'bg-emerald-100 text-emerald-800',
  'Pump & Nitric Oxide': 'bg-violet-100 text-violet-800',
  'Performance & Endurance': 'bg-fuchsia-100 text-fuchsia-800',
  'Health': 'bg-rose-100 text-rose-800',
  'Recovery': 'bg-orange-100 text-orange-800',
}

const FLAVOR_PILL_COLORS = [
  'bg-pink-100 text-pink-800',
  'bg-purple-100 text-purple-800',
  'bg-blue-100 text-blue-800',
  'bg-teal-100 text-teal-800',
  'bg-orange-100 text-orange-800',
  'bg-rose-100 text-rose-800',
  'bg-cyan-100 text-cyan-800',
  'bg-indigo-100 text-indigo-800',
]

function getFlavorPillColor(flavor: string): string {
  let hash = 0
  for (let i = 0; i < flavor.length; i++) {
    hash = flavor.charCodeAt(i) + ((hash << 5) - hash)
  }
  return FLAVOR_PILL_COLORS[Math.abs(hash) % FLAVOR_PILL_COLORS.length]
}

const ALL_CATEGORIES = Object.keys(CATEGORY_EMOJI)

const CATEGORY_GRADIENT_MAP: Record<string, string> = {
  blue: 'from-blue-500 to-blue-700',
  green: 'from-green-500 to-green-700',
  orange: 'from-orange-500 to-red-600',
  purple: 'from-purple-500 to-purple-700',
  teal: 'from-teal-500 to-teal-700',
  amber: 'from-amber-500 to-amber-700',
  red: 'from-red-500 to-rose-700',
  yellow: 'from-yellow-500 to-yellow-700',
  sky: 'from-sky-500 to-sky-700',
  stone: 'from-stone-500 to-stone-700',
  lime: 'from-lime-500 to-lime-700',
  pink: 'from-pink-500 to-pink-700',
  indigo: 'from-indigo-500 to-indigo-700',
  slate: 'from-slate-500 to-slate-700',
  cyan: 'from-cyan-500 to-cyan-700',
  emerald: 'from-emerald-500 to-emerald-700',
  violet: 'from-violet-500 to-violet-700',
  fuchsia: 'from-fuchsia-500 to-fuchsia-700',
  rose: 'from-rose-400 to-rose-600',
  gray: 'from-gray-500 to-gray-700',
}

const CATEGORY_PILL_MAP: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  orange: 'bg-orange-100 text-orange-800',
  purple: 'bg-purple-100 text-purple-800',
  teal: 'bg-teal-100 text-teal-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  sky: 'bg-sky-100 text-sky-800',
  stone: 'bg-stone-100 text-stone-800',
  lime: 'bg-lime-100 text-lime-800',
  pink: 'bg-pink-100 text-pink-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  slate: 'bg-slate-100 text-slate-800',
  cyan: 'bg-cyan-100 text-cyan-800',
  emerald: 'bg-emerald-100 text-emerald-800',
  violet: 'bg-violet-100 text-violet-800',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-800',
  rose: 'bg-rose-100 text-rose-800',
  gray: 'bg-gray-100 text-gray-800',
}

export default function ProductsPage() {
  const { data: session } = useSession()
  const canManage = ['ADMIN', 'MANAGER'].includes(session?.user?.role || '')

  const [view, setView] = useState<'categories' | 'products'>('categories')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [totalProducts, setTotalProducts] = useState(0)

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [allBrands, setAllBrands] = useState<string[]>([])

  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const [dbCategories, setDbCategories] = useState<CategoryItem[]>([])
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('📦')
  const [categoryError, setCategoryError] = useState('')
  const [categorySuccess, setCategorySuccess] = useState('')

  const loadProducts = useCallback(async (
    pageNum: number = 1,
    searchTerm: string = '',
    category: string = '',
    brand: string = ''
  ) => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({ page: String(pageNum), limit: '20' })
      if (searchTerm) params.set('search', searchTerm)
      if (category) params.set('category', category)
      if (brand) params.set('brand', brand)
      const res = await fetch(`/api/products?${params}`)
      if (!res.ok) throw new Error('Failed to fetch products')
      const data = await res.json()
      setProducts(data.data)
      setPagination(data.pagination)
      setPage(pageNum)

      const brands = [...new Set(data.data.map((p: Product) => p.brand))].sort() as string[]
      setAllBrands(brands)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    async function fetchCounts() {
      try {
        const res = await fetch('/api/products?limit=500')
        if (!res.ok) return
        const data = await res.json()
        const allProducts = data.data || []
        if (controller.signal.aborted) return
        setTotalProducts(allProducts.length)
        const counts: Record<string, number> = {}
        for (const cat of ALL_CATEGORIES) {
          counts[cat] = allProducts.filter((p: Product) => p.category === cat).length
        }
        setCategoryCounts(counts)
      } catch {
        // silently fail for counts
      }
    }
    fetchCounts()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (view !== 'products') return
    async function run() {
      await loadProducts(page, activeSearch, selectedCategory || '', brandFilter)
    }
    run()
  }, [view, page, activeSearch, selectedCategory, brandFilter, loadProducts])

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories')
        if (res.ok) {
          const data = await res.json()
          setDbCategories(data)
        }
      } catch {
        // silently fail
      }
    }
    fetchCategories()
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveSearch(search)
    setSelectedCategory(null)
    setView('products')
    setPage(1)
  }

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category)
    setSearch('')
    setActiveSearch('')
    setBrandFilter('')
    setView('products')
    setPage(1)
  }

  const handleShowAll = () => {
    setSelectedCategory(null)
    setSearch('')
    setActiveSearch('')
    setBrandFilter('')
    setView('products')
    setPage(1)
  }

  const handleBackToCategories = () => {
    setView('categories')
    setSelectedCategory(null)
    setSearch('')
    setActiveSearch('')
    setBrandFilter('')
    setPage(1)
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

      if (formData.flavor.trim()) payload.flavor = formData.flavor.trim()
      if (formData.barcode.trim()) payload.barcode = formData.barcode.trim()
      if (formData.description.trim()) payload.description = formData.description.trim()
      if (formData.expiryDate) payload.expiryDate = formData.expiryDate
      if (formData.batchNumber.trim()) payload.batchNumber = formData.batchNumber.trim()
      if (formData.storageLocation.trim()) payload.storageLocation = formData.storageLocation.trim()

      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'

      const res = await csrfFetch(url, {
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

      loadProducts(page, activeSearch, selectedCategory || '', brandFilter)


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
      flavor: (product as Product & { flavor?: string }).flavor || '',
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
      const res = await csrfFetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete product')
      }

      setSuccess('Product deleted successfully')
      loadProducts(page, activeSearch, selectedCategory || '', brandFilter)


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

  const handleCreateCategory = async () => {
    setCategoryError('')
    setCategorySuccess('')
    if (!newCategoryName.trim()) {
      setCategoryError('Category name is required')
      return
    }
    try {
      const res = await csrfFetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          emoji: newCategoryEmoji,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create category')
      }
      const created = await res.json()
      setDbCategories(prev => [...prev, created])
      setFormData(prev => ({ ...prev, category: created.name }))
      setNewCategoryName('')
      setNewCategoryEmoji('📦')
      setCategorySuccess(`Category "${created.name}" created!`)
      setTimeout(() => {
        setShowCategoryModal(false)
        setCategorySuccess('')
      }, 800)
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : 'Failed to create category')
    }
  }

  const getEmoji = (cat: string): string => {
    const dbCat = dbCategories.find(c => c.name === cat)
    if (dbCat) return dbCat.emoji
    return CATEGORY_EMOJI[cat] || '📦'
  }

  const getGradient = (cat: string): string => {
    const dbCat = dbCategories.find(c => c.name === cat)
    if (dbCat) return CATEGORY_GRADIENT_MAP[dbCat.color] || 'from-gray-500 to-gray-700'
    return CATEGORY_COLORS[cat] || 'from-gray-500 to-gray-700'
  }

  const getPillColor = (cat: string): string => {
    const dbCat = dbCategories.find(c => c.name === cat)
    if (dbCat) return CATEGORY_PILL_MAP[dbCat.color] || 'bg-gray-100 text-gray-800'
    return CATEGORY_PILL_COLORS[cat] || 'bg-gray-100 text-gray-800'
  }

  const allCategoryNames = [...new Set([...ALL_CATEGORIES, ...dbCategories.map(c => c.name)])]

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

  return (
    <div>
      {/* Error / Success Banners */}
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

      {/* ============ VIEW 1: CATEGORY GRID ============ */}
      {view === 'categories' && (
        <div>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-500 mt-1">
              Browse {totalProducts} products by category
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="mb-8">
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by name, brand, flavor, or SKU..."
                className="block w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
          </form>

          {/* Category Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {allCategoryNames.map((cat) => {
              const emoji = getEmoji(cat)
              const gradient = getGradient(cat)
              const count = categoryCounts[cat] || 0

              return (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat)}
                  className={`bg-gradient-to-br ${gradient} rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer text-white p-6 text-left group hover:scale-[1.02]`}
                >
                  <div className="text-3xl mb-3">{emoji}</div>
                  <h3 className="font-semibold text-sm leading-tight">{cat}</h3>
                  <p className="text-white/80 text-xs mt-1.5">
                    {count} {count === 1 ? 'product' : 'products'}
                  </p>
                </button>
              )
            })}

            {/* Add Custom Category Button */}
            {canManage && (
              <button
                onClick={() => setShowCategoryModal(true)}
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-left hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-200 cursor-pointer group flex flex-col items-center justify-center min-h-[140px]"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center mb-3 transition-colors">
                  <svg className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="font-semibold text-sm text-gray-500 group-hover:text-indigo-600 transition-colors">Add Category</h3>
                <p className="text-xs text-gray-400 mt-1 group-hover:text-indigo-400">Create custom category</p>
              </button>
            )}
          </div>

          {/* All Products Button */}
          <div className="text-center">
            <button
              onClick={handleShowAll}
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-indigo-600 text-indigo-600 font-medium rounded-xl hover:bg-indigo-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              All Products ({totalProducts})
            </button>
          </div>
        </div>
      )}

      {/* ============ VIEW 2: PRODUCT LIST ============ */}
      {view === 'products' && (
        <div>
          {/* Back Button */}
          <button
            onClick={handleBackToCategories}
            className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-medium text-sm mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Categories
          </button>

          {/* Header with Add button */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedCategory || 'All Products'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {pagination.total} {pagination.total === 1 ? 'product' : 'products'} found
              </p>
            </div>
            {canManage && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Product
              </button>
            )}
          </div>

          {/* Search Bar */}
          <form onSubmit={(e) => { e.preventDefault(); setActiveSearch(search); setPage(1); }} className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
          </form>

          {/* Brand Filter Pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => { setBrandFilter(''); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !brandFilter
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Brands
            </button>
            {allBrands.map((brand) => (
              <button
                key={brand}
                onClick={() => { setBrandFilter(brand); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  brandFilter === brand
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="ml-3 text-gray-600">Loading products...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedCategory
                  ? `No products in the "${selectedCategory}" category yet.`
                  : 'Get started by adding a new product.'}
              </p>
              <div className="mt-6">
                {canManage && (
                  <button
                    onClick={openAddModal}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Product
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Product Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => {
                const flavor = (product as Product & { flavor?: string }).flavor
                const isLowStock = product.quantity <= product.minStock

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow duration-200 flex flex-col"
                  >
                    {/* Product Name + Brand */}
                    <h3 className="font-bold text-gray-900 text-sm leading-tight mb-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">{product.brand}</p>

                    {/* Flavor + Category Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {flavor && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getFlavorPillColor(flavor)}`}>
                          {flavor}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          getPillColor(product.category)
                        }`}
                      >
                        {product.category}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="mb-2">
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(product.sellingPrice)}
                      </span>
                    </div>

                    {/* Stock */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          isLowStock ? 'bg-red-500' : 'bg-green-500'
                        }`}
                      />
                      <span className={`text-xs font-medium ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                        {product.quantity} in stock
                      </span>
                      {isLowStock && (
                        <span className="text-[10px] text-red-500 font-medium ml-1">Low</span>
                      )}
                    </div>

                    {/* SKU */}
                    <p className="text-[11px] text-gray-400 mb-3">SKU: {product.sku}</p>

                    {/* Spacer */}
                    <div className="mt-auto" />

                    {/* Actions */}
                    {canManage && (
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleEdit(product)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Page {page} of {pagination.pages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(page - 2, pagination.pages - 4)) + i
                  if (pageNum > pagination.pages) return null
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
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
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.pages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ ADD / EDIT MODAL ============ */}
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
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name *</label>
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
                    {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">SKU *</label>
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
                    {formErrors.sku && <p className="mt-1 text-sm text-red-600">{formErrors.sku}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category *</label>
                    <div className="flex gap-2">
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                          formErrors.category ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select category</option>
                        {allCategoryNames.map((cat) => (
                          <option key={cat} value={cat}>
                            {getEmoji(cat)} {cat}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowCategoryModal(true)}
                        className="mt-1 px-3 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium whitespace-nowrap"
                        title="Create new category"
                      >
                        + New
                      </button>
                    </div>
                    {formErrors.category && <p className="mt-1 text-sm text-red-600">{formErrors.category}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Brand *</label>
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
                    {formErrors.brand && <p className="mt-1 text-sm text-red-600">{formErrors.brand}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Flavor</label>
                    <input
                      type="text"
                      name="flavor"
                      value={formData.flavor}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g. Chocolate, Vanilla"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Barcode</label>
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
                    <label className="block text-sm font-medium text-gray-700">Purchase Price *</label>
                    <input
                      type="number"
                      name="purchasePrice"
                      value={formData.purchasePrice}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        formErrors.purchasePrice ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                    />
                    {formErrors.purchasePrice && <p className="mt-1 text-sm text-red-600">{formErrors.purchasePrice}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Selling Price *</label>
                    <input
                      type="number"
                      name="sellingPrice"
                      value={formData.sellingPrice}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        formErrors.sellingPrice ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                    />
                    {formErrors.sellingPrice && <p className="mt-1 text-sm text-red-600">{formErrors.sellingPrice}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
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
                    {formErrors.quantity && <p className="mt-1 text-sm text-red-600">{formErrors.quantity}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Min Stock</label>
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
                    {formErrors.minStock && <p className="mt-1 text-sm text-red-600">{formErrors.minStock}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                    <input
                      type="date"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Batch Number</label>
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
                    <label className="block text-sm font-medium text-gray-700">Storage Location</label>
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
                  <label className="block text-sm font-medium text-gray-700">Description</label>
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
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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

      {/* ============ CREATE CATEGORY MODAL ============ */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={() => { setShowCategoryModal(false); setCategoryError(''); setCategorySuccess('') }}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Create New Category</h3>
                <button
                  onClick={() => { setShowCategoryModal(false); setCategoryError(''); setCategorySuccess('') }}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4">
                {categoryError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {categoryError}
                  </div>
                )}
                {categorySuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
                    {categorySuccess}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. Energy Drinks"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{newCategoryEmoji}</span>
                    <input
                      type="text"
                      value={newCategoryEmoji}
                      onChange={(e) => setNewCategoryEmoji(e.target.value || '📦')}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-2xl"
                      maxLength={4}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Type an emoji or pick one from your keyboard</p>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => { setShowCategoryModal(false); setCategoryError(''); setCategorySuccess('') }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Create Category
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
