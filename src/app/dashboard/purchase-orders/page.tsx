'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { csrfFetch } from '@/lib/csrf-client'
import { formatCurrency, formatDate } from '@/utils'
import { escapeHtml } from '@/utils/escape-html'
import Pagination from '@/components/Pagination'

interface Supplier { id: string; name: string; phone?: string; email?: string }
interface Product { id: string; name: string; sku: string }
interface OrderItem {
  id?: string
  productId: string
  quantity: number | ''
  unitPrice: number | ''
  lotNumber?: string
  expiryDate?: string
  product?: Product
}
interface PurchaseOrder {
  id: string
  supplierId: string
  status: string
  totalAmount: number
  expectedDeliveryDate?: string | null
  notes: string | null
  createdAt: string
  supplier: { name: string }
  items: OrderItem[]
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

export default function PurchaseOrdersPage() {
  const { data: session } = useSession()
  const canManage = ['ADMIN', 'MANAGER'].includes(session?.user?.role || '')
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [formData, setFormData] = useState({
    supplierId: '',
    notes: '',
    expectedDeliveryDate: '',
    items: [{ productId: '', quantity: 1, unitPrice: 0, lotNumber: '', expiryDate: '' }],
  })
  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [statusFilter, setStatusFilter] = useState('')

  const loadOrders = useCallback(async (pageNum: number) => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({ page: String(pageNum), limit: '20' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/purchase-orders?${params}`)
      if (!res.ok) throw new Error('Failed to fetch purchase orders')
      const data = await res.json()
      setOrders(data.data)
      setPagination(data.pagination)
      setPage(pageNum)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch purchase orders')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

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

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const [suppliersRes, productsRes] = await Promise.all([
          fetch('/api/suppliers?limit=100'),
          fetch('/api/products?limit=100'),
        ])
        if (suppliersRes.ok && !cancelled) {
          const data = await suppliersRes.json()
          setSuppliers(data.data)
        }
        if (productsRes.ok && !cancelled) {
          const data = await productsRes.json()
          setProducts(data.data)
        }
        setLoading(true)
        setError('')
        const params = new URLSearchParams({ page: '1', limit: '20' })
        if (statusFilter) params.set('status', statusFilter)
        const ordersRes = await fetch(`/api/purchase-orders?${params}`)
        if (!cancelled) {
          if (!ordersRes.ok) throw new Error('Failed to fetch purchase orders')
          const data = await ordersRes.json()
          setOrders(data.data)
          setPagination(data.pagination)
          setPage(1)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [statusFilter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    if (!formData.supplierId) {
      setError('Please select a supplier')
      setSubmitting(false)
      return
    }

    const invalidItem = formData.items.find(item => !item.productId || item.quantity <= 0 || item.unitPrice <= 0)
    if (invalidItem) {
      setError('Each item must have a product, quantity > 0, and price > 0')
      setSubmitting(false)
      return
    }

    try {
      const payload = {
        ...formData,
        expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
        items: formData.items.map(item => ({
          productId: item.productId,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          lotNumber: item.lotNumber || undefined,
          expiryDate: item.expiryDate || undefined,
        })),
      }
      const res = await csrfFetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create purchase order')
      }
      setShowModal(false)
      setFormData({ supplierId: '', notes: '', expectedDeliveryDate: '', items: [{ productId: '', quantity: 1, unitPrice: 0, lotNumber: '', expiryDate: '' }] })
      setSuccess('Purchase order created successfully')
      loadOrders(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase order')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await csrfFetch(`/api/purchase-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update status')
      }
      setSuccess(`Order ${status.toLowerCase()} successfully`)
      loadOrders(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this purchase order?')) return
    try {
      const res = await csrfFetch(`/api/purchase-orders/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }
      setSuccess('Purchase order deleted')
      loadOrders(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { productId: '', quantity: 1, unitPrice: 0, lotNumber: '', expiryDate: '' }] })
  }

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) })
  }

  const updateItem = (index: number, field: string, value: string | number) => {
    const items = [...formData.items]
    items[index] = { ...items[index], [field]: value }
    setFormData({ ...formData, items })
  }

  const totalAmount = formData.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)

  const printPo = (order: PurchaseOrder) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600,noopener,noreferrer')
    if (!printWindow) return

    const itemRows = order.items.map(item => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(item.product?.name || item.productId)}</td>
        <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(item.product?.sku || '-')}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${Number(item.quantity) || 0}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatCurrency(Number(item.unitPrice) || 0)}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatCurrency((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order - ${escapeHtml(order.id.slice(0, 8))}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .title { font-size: 28px; font-weight: bold; color: #333; }
          .po-number { font-size: 14px; color: #666; margin-top: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .info-box { padding: 15px; background: #f9f9f9; border-radius: 8px; }
          .info-box h3 { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 8px; }
          .info-box p { font-size: 14px; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #333; color: white; padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; }
          td { font-size: 13px; }
          .total-row { font-weight: bold; background: #f0f0f0; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">PURCHASE ORDER</div>
            <div class="po-number">PO-${order.id.slice(0, 8).toUpperCase()}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:14px;"><strong>Status:</strong> ${order.status}</div>
            <div style="font-size:12px;color:#666;">Date: ${formatDate(order.createdAt)}</div>
            ${order.expectedDeliveryDate ? `<div style="font-size:12px;color:#666;">Expected: ${formatDate(order.expectedDeliveryDate)}</div>` : ''}
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>Supplier</h3>
            <p><strong>${escapeHtml(order.supplier.name)}</strong></p>
          </div>
          <div class="info-box">
            <h3>Order Details</h3>
            <p>Items: ${order.items.length}</p>
            ${order.notes ? `<p>Notes: ${escapeHtml(order.notes)}</p>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th style="text-align:center;">Quantity</th>
              <th style="text-align:right;">Unit Price</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
            <tr class="total-row">
              <td colspan="4" style="padding:10px 8px;text-align:right;">TOTAL:</td>
              <td style="padding:10px 8px;text-align:right;">${formatCurrency(order.totalAmount)}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        {canManage && (
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            New Order
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}
      {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>}

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="RECEIVED">Received</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No purchase orders found</div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">PO-{order.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.supplier.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{order.items.length} items</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(Number(order.totalAmount))}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[order.status] || 'bg-gray-100'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(order.createdAt)}</td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button onClick={() => printPo(order)} className="text-indigo-600 hover:text-indigo-900">Print</button>
                    {canManage && order.status === 'PENDING' && (
                      <>
                        <button onClick={() => handleStatusUpdate(order.id, 'APPROVED')} className="text-blue-600 hover:text-blue-900">Approve</button>
                        <button onClick={() => handleStatusUpdate(order.id, 'CANCELLED')} className="text-red-600 hover:text-red-900">Cancel</button>
                      </>
                    )}
                    {canManage && order.status === 'APPROVED' && (
                      <button onClick={() => handleStatusUpdate(order.id, 'RECEIVED')} className="text-green-600 hover:text-green-900">Receive</button>
                    )}
                    {session?.user?.role === 'ADMIN' && order.status === 'PENDING' && (
                      <button onClick={() => handleDelete(order.id)} className="text-red-600 hover:text-red-900">Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            page={page}
            pages={pagination.pages}
            total={pagination.total}
            onPageChange={loadOrders}
          />
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">New Purchase Order</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Items</label>
                    <button type="button" onClick={addItem} className="text-sm text-indigo-600 hover:text-indigo-500">+ Add Item</button>
                  </div>
                  <div className="space-y-3">
                    {formData.items.map((item, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-2">
                        <div className="flex gap-3 items-end">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Product</label>
                            <select
                              value={item.productId}
                              onChange={(e) => updateItem(index, 'productId', e.target.value)}
                              required
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                              <option value="">Select product</option>
                              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Qty</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', e.target.value === '' ? '' : parseInt(e.target.value) || 1)}
                              min={1}
                              required
                              className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Unit Price (₹)</label>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, 'unitPrice', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                              min={0.01}
                              step={0.01}
                              required
                              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              placeholder="e.g. 10.00"
                            />
                          </div>
                          {formData.items.length > 1 && (
                            <button type="button" onClick={() => removeItem(index)} className="text-red-600 hover:text-red-900 text-sm mb-2">Remove</button>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500">Batch/Lot Number</label>
                            <input
                              type="text"
                              value={item.lotNumber || ''}
                              onChange={(e) => updateItem(index, 'lotNumber', e.target.value)}
                              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                              placeholder="Optional"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-gray-500">Expiry Date</label>
                            <input
                              type="date"
                              value={item.expiryDate || ''}
                              onChange={(e) => updateItem(index, 'expiryDate', e.target.value)}
                              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Total: {formatCurrency(totalAmount)}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 hover:text-gray-900">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {submitting ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
