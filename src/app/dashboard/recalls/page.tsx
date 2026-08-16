'use client'

import { useState, useEffect } from 'react'
import { csrfFetch } from '@/lib/csrf-client'

interface Recall {
  id: string
  batchNumber: string
  productName: string
  reason: string
  status: string
  affectedQuantity: number
  notes: string | null
  createdAt: string
}

interface RecallSale {
  id: string
  quantity: number
  totalAmount: number
  createdAt: string
  product: { name: string; sku: string }
}

export default function RecallsPage() {
  const [recalls, setRecalls] = useState<Recall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedRecall, setSelectedRecall] = useState<Recall | null>(null)
  const [recallSales, setRecallSales] = useState<RecallSale[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [formData, setFormData] = useState({
    batchNumber: '',
    reason: '',
    notes: '',
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const res = await fetch('/api/recalls')
        if (!res.ok) throw new Error('Failed to fetch recalls')
        const data = await res.json()
        if (!cancelled) setRecalls(data.data || [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
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

  const loadRecalls = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/recalls')
      if (!res.ok) throw new Error('Failed to fetch recalls')
      const data = await res.json()
      setRecalls(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.batchNumber.trim() || !formData.reason.trim()) {
      setError('Batch number and reason are required')
      return
    }

    try {
      const res = await csrfFetch('/api/recalls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create recall')
      }

      const result = await res.json()
      setSuccess(`Recall created for batch ${formData.batchNumber}. ${result.sales?.length || 0} affected sales found.`)
      setShowModal(false)
      setFormData({ batchNumber: '', reason: '', notes: '' })
      loadRecalls()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create recall')
    }
  }

  const viewRecallDetail = async (recall: Recall) => {
    setSelectedRecall(recall)
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/recalls?batchNumber=${recall.batchNumber}`)
      if (!res.ok) throw new Error('Failed to fetch recall details')
      const data = await res.json()
      setRecallSales(data.sales || [])
    } catch {
      setRecallSales([])
    } finally {
      setLoadingDetail(false)
    }
  }

  const activeRecalls = recalls.filter(r => r.status === 'ACTIVE')

  const handleDelete = async (id: string, batchNumber: string) => {
    if (!window.confirm(`Delete recall for batch "${batchNumber}"?`)) return
    setError('')
    setSuccess('')
    try {
      const res = await csrfFetch(`/api/recalls/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete recall')
      }
      setSuccess('Recall deleted')
      loadRecalls()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recall')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recall Management</h1>
          <p className="text-sm text-gray-500 mt-1">Isolate affected batches and review affected sales</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          Start Recall
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">{success}</div>
      )}

      {activeRecalls.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-semibold text-red-800">
                {activeRecalls.length} Active Recall{activeRecalls.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-red-600">
                {activeRecalls.reduce((s, r) => s + r.affectedQuantity, 0)} total units affected
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty Affected</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recalls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                      No recalls recorded yet
                    </td>
                  </tr>
                ) : (
                  recalls.map((recall) => (
                    <tr key={recall.id}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(recall.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono font-medium text-gray-900">{recall.batchNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{recall.productName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{recall.reason}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{recall.affectedQuantity}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          recall.status === 'ACTIVE' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {recall.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewRecallDetail(recall)}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => handleDelete(recall.id, recall.batchNumber)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedRecall && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setSelectedRecall(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Recall: {selectedRecall.batchNumber}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedRecall.productName} - {selectedRecall.reason}</p>
                </div>
                <button onClick={() => setSelectedRecall(null)} className="text-gray-400 hover:text-gray-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                {loadingDetail ? (
                  <p className="text-center text-gray-500 py-8">Loading affected sales...</p>
                ) : recallSales.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No sales found for this batch number</p>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      {recallSales.length} sale(s) affected - {recallSales.reduce((s, sale) => s + sale.quantity, 0)} units
                    </p>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {recallSales.map((sale) => (
                          <tr key={sale.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {new Date(sale.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-gray-900">{sale.quantity}</td>
                            <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                              ₹{Number(sale.totalAmount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Start Product Recall</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Batch Number *</label>
                  <input
                    type="text"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter batch number to recall"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason *</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Reason for recall (e.g., contamination, mislabeling)"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Additional notes"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
                    Start Recall
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
